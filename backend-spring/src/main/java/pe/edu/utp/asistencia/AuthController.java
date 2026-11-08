package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UsuarioRepository users;private final SqlRepository db;private final Tokens tokens;private final BCryptPasswordEncoder passwords;
    private final TransactionTemplate tx;private final ObjectProvider<JavaMailSender> mail;
    @Value("${app.reset-secret}") private String resetSecret;
    @Value("${app.mail-from}") private String from;
    @Value("${spring.mail.host:}") private String mailHost;
    @Value("${spring.mail.username:}") private String mailUser;
    @Value("${spring.mail.password:}") private String mailPassword;
    public AuthController(UsuarioRepository users,SqlRepository db,Tokens tokens,BCryptPasswordEncoder passwords,TransactionTemplate tx,ObjectProvider<JavaMailSender> mail){this.users=users;this.db=db;this.tokens=tokens;this.passwords=passwords;this.tx=tx;this.mail=mail;}
    private Map<String,Object> dto(Usuario u){boolean face=!db.query("SELECT 1 FROM alumno WHERE usuario_id=:p1 AND rostro_embedding IS NOT NULL",u.id).isEmpty();return obj("id",u.id,"correo",u.correo,"nombres",u.nombres,"apellidos",u.apellidos,"rol",u.rol,"embeddingRegistrado",face);}
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,Object> body){
        String email=text(body,"correo").toLowerCase(Locale.ROOT),pass=str(body,"contrasena");if(email.isEmpty()||pass.isEmpty())throw error(400,"Correo y contraseña requeridos.");
        var u=users.findByCorreoAndActivoTrue(email).orElseThrow(()->error(401,"Credenciales inválidas."));
        if(!passwords.matches(pass,u.contrasenaHash))throw error(401,"Credenciales inválidas.");
        return obj("message","Inicio de sesión exitoso","token",tokens.issue(obj("id",u.id.toString(),"rol",u.rol,"correo",u.correo),28800),"usuario",dto(u));
    }
    @GetMapping("/perfil") public Map<String,Object> perfil(){return obj("message","Perfil cargado.","usuario",dto(users.findByIdAndActivoTrue(CurrentUser.get().id()).orElseThrow(()->error(401,"Cuenta inactiva."))));}
    public static void validatePassword(String password,Map<String,?> user){
        if(password.length()<8||password.length()>14)throw error(400,"Usa entre 8 y 14 caracteres.");
        if(!password.matches("(?s).*[a-z].*")||!password.matches("(?s).*[A-Z].*")||!password.matches("(?s).*\\d.*"))throw error(400,"Incluye una minúscula, una mayúscula y un número.");
        String parts=str(user,"nombres")+" "+str(user,"apellidos")+" "+str(user,"correo").split("@",2)[0];
        for(String part:parts.split("[\\s._-]+"))if(part.length()>=3&&password.toLowerCase(Locale.ROOT).contains(part.toLowerCase(Locale.ROOT)))throw error(400,"No incluyas tu nombre, apellido ni usuario de correo en la contraseña.");
    }
    @PostMapping("/cambiar-contrasena") public Map<String,Object> change(@RequestBody Map<String,Object> b){
        var u=required(db.rows("cambiarContrasenaAutenticado-1",CurrentUser.get().id()),400,"Cuenta no disponible.");
        String old=str(b,"actual"),next=str(b,"nueva"),hash=str(u,"contrasena_hash");
        if(!passwords.matches(old,hash))throw error(400,"La contraseña actual no es correcta.");
        if(passwords.matches(next,hash))throw error(400,"La nueva contraseña debe ser diferente de la actual.");
        validatePassword(next,u);db.update("cambiarContrasenaAutenticado-2",passwords.encode(next),u.get("id"));return message("Contraseña actualizada correctamente.");
    }
    @PostMapping("/recuperacion/solicitar") public Map<String,Object> request(@RequestBody Map<String,Object>b){
        String email=text(b,"correo").toLowerCase(Locale.ROOT);
        if(!email.matches("[^\\s@]+@utp\\.edu\\.pe"))throw error(400,"Ingresa un correo institucional @utp.edu.pe válido.");
        if(mailHost.isBlank()||mailUser.isBlank()||mailPassword.isBlank()||mail.getIfAvailable()==null)throw error(503,"La recuperación por correo aún no está configurada en el servidor.");
        tx.executeWithoutResult(status->{
            var rows=db.query("SELECT id,correo,nombres FROM usuario WHERE correo=:p1 AND activo=TRUE FOR UPDATE",email);
            if(rows.isEmpty())return;var user=rows.get(0);
            if(!db.rows("solicitarRecuperacion-2",user.get("id")).isEmpty())return;
            String code=tokens.code();db.update("solicitarRecuperacion-3",user.get("id"),Tokens.hmac(resetSecret,code));
            var msg=new SimpleMailMessage();msg.setFrom(from);msg.setTo(email);msg.setSubject("Código para recuperar tu contraseña - Asistencia UTP");msg.setText("Hola "+user.get("nombres")+", tu código de recuperación es "+code+". Vence en 10 minutos. Si no solicitaste este cambio, ignora este correo.");mail.getObject().send(msg);
        });return message("Si el correo está registrado, recibirás un código de recuperación.");
    }
    @PostMapping("/recuperacion/verificar") public Map<String,Object> verify(@RequestBody Map<String,Object>b){
        String email=text(b,"correo").toLowerCase(Locale.ROOT),code=text(b,"codigo");if(!code.matches("\\d{6}"))throw error(400,"El código debe tener 6 dígitos.");
        String token=tx.execute(status->{var rows=db.rows("verificarCodigoRecuperacion-1",email);if(rows.isEmpty())return null;var r=rows.get(0);
            if(number(r.get("intentos"))>=5||!Tokens.equal(str(r,"codigo_hash"),Tokens.hmac(resetSecret,code))){db.update("verificarCodigoRecuperacion-2",r.get("usuario_id"));return null;}
            String value=tokens.randomToken();db.update("verificarCodigoRecuperacion-3",r.get("usuario_id"),Tokens.hmac(resetSecret,value));return value;});
        if(token==null)throw error(400,"El código es incorrecto o venció.");return obj("token",token);
    }
    @PostMapping("/recuperacion/restablecer") public Map<String,Object> reset(@RequestBody Map<String,Object>b){
        String token=str(b,"token"),pass=str(b,"contrasena");if(token.isEmpty()||pass.isEmpty())throw error(400,"Token y nueva contraseña requeridos.");
        tx.executeWithoutResult(status->{var u=required(db.rows("restablecerContrasena-1",Tokens.hmac(resetSecret,token)),400,"La autorización venció. Solicita un código nuevo.");validatePassword(pass,u);db.update("restablecerContrasena-2",passwords.encode(pass),u.get("id"));db.update("restablecerContrasena-3",u.get("id"));});return message("Contraseña actualizada. Ya puedes iniciar sesión.");
    }
}

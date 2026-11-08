package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.*;
@RestController @RequestMapping("/api/admin")
public class AdminController {
    private final SqlRepository db;private final BCryptPasswordEncoder passwords;
    public AdminController(SqlRepository db,BCryptPasswordEncoder passwords){this.db=db;this.passwords=passwords;}
    private CurrentUser admin(){var u=CurrentUser.get();u.roles("admin");return u;}
    @GetMapping("/docentes") public Map<String,Object> teachers(){admin();return obj("docentes",db.rows("listarDocentes-1"));}
    @GetMapping("/alumnos") public Map<String,Object> students(){admin();return obj("alumnos",db.rows("listarAlumnos-1"));}
    @GetMapping("/cursos") public Map<String,Object> courses(){admin();return obj("cursos",db.rows("listarCursosAdmin-1"));}
    @GetMapping("/incidencias-docentes") public Map<String,Object> incidents(){admin();return obj("incidencias",db.rows("listarIncidenciasDocente-1"));}
    @GetMapping("/resumen") public Map<String,Object> summary(){admin();var result=db.rows("obtenerResumenAdmin-1").get(0);result.put("asistencia_por_curso",db.rows("obtenerResumenAdmin-2"));result.put("distribucion_estados",db.rows("obtenerResumenAdmin-3"));result.put("alumnos_en_riesgo",db.rows("obtenerResumenAdmin-4"));return result;}
    @PatchMapping("/docentes/{docenteId}/estado") @Transactional public Map<String,Object> status(@PathVariable UUID docenteId,@RequestBody Map<String,Object>b){
        var u=admin();if(!(b.get("activo") instanceof Boolean active))throw error(400,"Indica si la cuenta debe quedar activa o inactiva.");required(db.rows("actualizarEstadoDocente-1",active,u.id(),docenteId),404,"No se encontró el docente.");db.update("actualizarEstadoDocente-2",u.id(),"actualizar",docenteId.toString(),json(obj("cambio","estado_cuenta_docente","activo",active)));return obj("message",active?"Cuenta del docente activada.":"Cuenta del docente desactivada.","activo",active);
    }
    @PostMapping("/alumnos/{alumnoId}/cursos/{cursoId}/retirar") @Transactional public Map<String,Object> withdraw(@PathVariable UUID alumnoId,@PathVariable UUID cursoId){var u=admin();var m=required(db.rows("retirarAlumnoCurso-1",u.id(),alumnoId,cursoId),404,"No se encontró una matrícula activa para retirar.");db.update("retirarAlumnoCurso-2",u.id(),m.get("id").toString(),json(obj("alumnoId",alumnoId,"cursoId",cursoId,"estado","retirada")));return message("Alumno retirado del curso.");}
    @PostMapping("/alumnos") @ResponseStatus(HttpStatus.CREATED) @Transactional public Map<String,Object> register(@RequestBody Map<String,Object>b){
        var u=admin();String names=text(b,"nombres"),surname=text(b,"apellidos"),email=text(b,"correo").toLowerCase(Locale.ROOT),code=text(b,"codigo_alumno").toUpperCase(Locale.ROOT),pass=str(b,"contrasena");UUID course=uuid(b.get("curso_id"));
        if(names.isEmpty()||names.length()>100||surname.isEmpty()||surname.length()>100||!email.matches("[^\\s@]+@utp\\.edu\\.pe")||!code.matches("[A-Z0-9-]{3,20}"))throw error(400,"Completa nombres, apellidos, correo @utp.edu.pe, código, contraseña y curso.");
        AuthController.validatePassword(pass,obj("nombres",names,"apellidos",surname,"correo",email));var c=required(db.rows("registrarAlumno-1",course),404,"El curso no existe o está inactivo.");if(number(db.rows("registrarAlumno-2",course).get(0).get("total"))>=number(c.get("capacidad_alumnos")))throw error(409,"El curso ya alcanzó el máximo de alumnos.");
        var inserted=db.rows("registrarAlumno-3",email,passwords.encode(pass),names,surname,u.id()).get(0);db.update("registrarAlumno-4",inserted.get("id"),code,u.id());db.update("registrarAlumno-5",course,inserted.get("id"),u.id());return obj("message","Alumno registrado y matriculado.","id",inserted.get("id"));
    }
    @PostMapping("/incidencias-docentes/{id}/resolver") public Map<String,Object> resolve(@PathVariable UUID id,@RequestBody Map<String,Object>b){var u=admin();String decision=str(b,"decision"),comment=str(b,"comentario");if(!Set.of("aprobada","rechazada").contains(decision))throw error(400,"La decisión debe ser aprobada o rechazada.");required(db.rows("resolverIncidenciaDocente-1",decision,u.id(),comment.substring(0,Math.min(comment.length(),1000)),id),404,"La incidencia no existe o ya fue revisada.");return message(decision.equals("aprobada")?"Incidencia verificada.":"Incidencia rechazada.");}
    @GetMapping("/incidencias-docentes/{id}/evidencia") public ResponseEntity<byte[]> evidence(@PathVariable UUID id){admin();return download(required(db.rows("descargarEvidenciaIncidencia-1",id),404,"No hay evidencia adjunta."));}
}

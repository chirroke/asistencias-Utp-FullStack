package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/alumno")
public class StudentController {
    private final SqlRepository db;private final LiveAttendance live;
    @Value("${app.face-threshold}") private double threshold;
    public StudentController(SqlRepository db,LiveAttendance live){this.db=db;this.live=live;}
    private CurrentUser student(){var u=CurrentUser.get();u.roles("alumno");return u;}
    @GetMapping("/resumen") public Map<String,Object> summary(){
        var u=student();var info=required(db.rows("obtenerResumen-1",u.id()),404,"No existe un perfil de alumno para esta cuenta.");info.put("codigo",info.get("codigo_alumno"));var courses=db.rows("obtenerResumen-2",u.id());
        int classes=0,present=0,absent=0,justified=0;for(var c:courses){classes+=number(c.get("total_clases"));present+=number(c.get("presentes"));absent+=number(c.get("faltas"));justified+=number(c.get("justificadas"));}
        return obj("alumno",info,"resumen",obj("clases",classes,"presentes",present,"faltas",absent,"justificadas",justified,"porcentajeFaltas",classes==0?0:Math.round(absent*1000.0/classes)/10.0),"cursos",courses,"justificaciones",db.rows("obtenerResumen-3",u.id()),"historial",db.rows("obtenerResumen-4",u.id()),"faltasJustificables",db.rows("obtenerResumen-5",u.id()));
    }
    @PostMapping("/perfil/rostro") public Map<String,Object> enrollFace(@RequestParam Map<String,String>b,@RequestParam(required=false)MultipartFile selfie){
        var u=student();byte[] bytes=file(selfie,true);double[] face=embedding(str(b,"embedding"));required(db.rows("registrarRostroAlumno-1",bytes,json(face),"face-api-1.7.15",u.id()),404,"No existe un perfil de alumno para esta cuenta.");return obj("message","Foto y patrón facial registrados. Ya puedes marcar asistencia con QR.","embeddingRegistrado",true);
    }
    @PostMapping("/asistencia/escanear") @ResponseStatus(HttpStatus.CREATED) @Transactional public Map<String,Object> scan(@RequestParam Map<String,String>b,@RequestParam(required=false)MultipartFile selfie){
        var u=student();byte[] bytes=file(selfie,true);double[] face=embedding(str(b,"embedding"));var payload=parse(str(b,"qr"));UUID sid=uuid(payload.get("sesion_id"));String token=str(payload,"token");if(token.isBlank())throw error(400,"El QR no contiene un token válido.");
        var s=required(db.rows("registrarConQR-1",sid),410,"El QR venció o la sesión fue cerrada.");
        if(!"activa".equals(s.get("estado"))||!(s.get("expira_en") instanceof Instant expiry)||!expiry.isAfter(Instant.now()))throw error(410,"El QR venció o la sesión fue cerrada.");
        if(!Tokens.equal(str(s,"token_qr"),token))throw error(400,"El QR ya no es válido. Escanea el código actual.");
        if(db.rows("registrarConQR-2",s.get("curso_id"),u.id()).isEmpty())throw error(403,"No estás matriculado en este curso.");
        var faces=db.rows("registrarConQR-3",u.id());if(faces.isEmpty()||faces.get(0).get("rostro_embedding")==null)throw error(409,"Primero registra tu foto facial desde Perfil → Seguridad biométrica.");
        double distance=faceDistance(embedding(str(faces.get(0),"rostro_embedding")),face);if(distance>threshold)throw error(403,"El rostro no coincide con el que registraste. Reintenta o solicita marcación manual al docente.");
        var attendance=required(db.rows("registrarConQR-4",sid,u.id(),bytes,Math.max(0,Math.min(1,1-distance))),409,"Tu asistencia ya fue registrada para esta sesión.");live.publish(sid,"asistencia_actualizada");
        return obj("message","Asistencia registrada.","curso",s.get("curso"),"seccion",s.get("seccion"),"registrado_en",attendance.get("registrado_en"));
    }
    @PostMapping("/justificaciones") @ResponseStatus(HttpStatus.CREATED) @Transactional public Map<String,Object> justify(@RequestParam Map<String,String>b,@RequestParam(required=false)MultipartFile evidencia){
        var u=student();UUID id=uuid(b.get("asistencia_id"));String reason=text(b,"motivo");if(reason.length()<5)throw error(400,"Describe el motivo con un mínimo de 5 caracteres.");byte[] bytes=file(evidencia,false);
        var a=required(db.rows("enviarJustificacion-1",id,u.id()),400,"Solo puedes justificar una falta de una sesión cerrada.");if(!"falta".equals(a.get("estado"))||!"cerrada".equals(a.get("estado_sesion")))throw error(400,"Solo puedes justificar una falta de una sesión cerrada.");
        if(!db.rows("enviarJustificacion-2",id).isEmpty())throw error(409,"Ya enviaste una justificación para esta falta.");
        var inserted=db.rows("enviarJustificacion-3",u.id(),a.get("curso_id"),reason,a.get("fecha"),filename(evidencia),evidencia.getContentType(),bytes).get(0);db.update("enviarJustificacion-4",inserted.get("id"),id);return obj("message","Justificación enviada para revisión.","id",inserted.get("id"));
    }
}

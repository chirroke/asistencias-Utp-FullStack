package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import java.time.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.*;
@RestController @RequestMapping("/api")
public class AttendanceController {
    private final SqlRepository db;private final SessionService sessions;private final Tokens tokens;private final LiveAttendance live;
    public AttendanceController(SqlRepository db,SessionService sessions,Tokens tokens,LiveAttendance live){this.db=db;this.sessions=sessions;this.tokens=tokens;this.live=live;}
    @GetMapping("/health") public Map<String,Object> health(){db.query("SELECT 1");return obj("status","UP","backend","Spring Boot","database","PostgreSQL");}
    @GetMapping("/cursos") public List<Map<String,Object>> courses(){var u=CurrentUser.get();u.roles("docente","admin");return db.rows("obtenerMisCursos-1",u.id()).stream().map(r->obj("id",r.get("id"),"codigo",r.get("codigo"),"nombre",r.get("nombre"),"seccion",r.get("seccion"),"alumnosTotal",number(r.get("alumnos_total")),"capacidadAlumnos",number(r.get("capacidad_alumnos")),"asistenciaPromedio",r.get("asistencia_promedio"),"docenteCheckin",r.get("docente_checkin"),"enCurso",r.get("sesion_activa_id")!=null,"sesionActivaId",r.get("sesion_activa_id"),"sesionHoraInicio",r.get("sesion_hora_inicio"),"sesionHoraFin",r.get("sesion_hora_fin"))).toList();}
    @PostMapping("/asistencia/abrir-sesion") @Transactional public ResponseEntity<?> open(@RequestBody Map<String,Object>b){
        var u=CurrentUser.get();u.roles("docente","admin");UUID id=uuid(b.get("curso_id"));var c=required(db.rows("abrirSesion-1",id),404,"Curso no encontrado o ciclo inactivo.");
        if(!u.admin()&&!u.id().equals(c.get("docente_id")))throw error(403,"No tienes acceso a este curso.");db.rows("abrirSesion-2","abrir-sesion:"+id);
        var active=db.rows("abrirSesion-3",id);if(!active.isEmpty())return ResponseEntity.ok(obj("sesion",active.get(0),"curso",c));
        boolean legacy=!db.rows("abrirSesion-4").isEmpty();var created=db.rows(legacy?"abrirSesion-5":"abrirSesion-6",id,"120",c.get("tolerancia_marcado_min"),u.id()).get(0);
        return ResponseEntity.status(201).body(obj("sesion",created,"curso",c));
    }
    @PostMapping("/asistencia/generar-qr") @Transactional public Map<String,Object> qr(@RequestBody Map<String,Object>b){
        UUID id=uuid(b.get("sesion_id"));double seconds=b.containsKey("duracion_segundos")?number(b.get("duracion_segundos")):20;
        if(seconds<5||seconds>60||seconds!=Math.floor(seconds))throw error(400,"duracion_segundos debe estar entre 5 y 60.");sessions.active(sessions.access(id,CurrentUser.get(),true));
        if(db.rows("generarQR-1",id).isEmpty())throw error(403,"No se puede proyectar un QR de un ciclo inactivo.");
        String token=tokens.qr(id);var expiry=java.sql.Timestamp.from(Instant.now().plusSeconds((long)seconds));var row=required(db.rows("generarQR-2",token,expiry,id),404,"Sesión no activa.");
        return obj("qr_code",json(obj("sesion_id",id,"token",token)),"expira_en",row.get("expira_en"));
    }
    @GetMapping("/asistencia/sesion/{id}/asistencia-vivo") public Map<String,Object> roster(@PathVariable UUID id){sessions.access(id,CurrentUser.get(),false);var rows=db.rows("obtenerAsistenciaVivo-1",id).stream().map(r->{String name=str(r,"nombre");String initials=Arrays.stream(name.split("\\s+")).filter(s->!s.isEmpty()).limit(2).map(s->s.substring(0,1)).reduce("",String::concat).toUpperCase(Locale.ROOT);var result=obj("id",r.get("id"),"codigo",r.get("codigo"),"nombre",name,"iniciales",initials,"estado",r.get("estado")==null?"pendiente":r.get("estado"),"hora",r.get("hora"));if(r.get("puntaje_facial")!=null)result.put("similitud",String.format(Locale.ROOT,"%.1f%%",number(r.get("puntaje_facial"))*100));if(r.get("foto_marcacion")!=null)result.put("foto","data:image/jpeg;base64,"+str(r,"foto_marcacion").replace("\n",""));return result;}).toList();return obj("alumnos",rows);}
    @GetMapping("/asistencia/sesion/{id}/ws-ticket") public Map<String,Object> ticket(@PathVariable UUID id){var u=CurrentUser.get();sessions.active(sessions.access(id,u,false));return obj("ticket",tokens.issue(obj("id",u.id().toString(),"scope","asistencia:live","sesionId",id.toString()),60));}
    @GetMapping("/asistencia/cursos/{cursoId}/historial") public Map<String,Object> history(@PathVariable UUID cursoId,@RequestParam(required=false)LocalDate desde,@RequestParam(required=false)LocalDate hasta){var u=CurrentUser.get();u.roles("docente","admin");var c=required(db.rows("obtenerHistorialCurso-1",cursoId),404,"Curso no encontrado.");if(!u.admin()&&!u.id().equals(c.get("docente_id")))throw error(403,"No tienes acceso a este curso.");return obj("sesiones",db.rows("obtenerHistorialCurso-2",cursoId,desde,hasta));}
    @GetMapping("/asistencia/sesion/{id}/detalle") public Map<String,Object> detail(@PathVariable UUID id){var s=sessions.access(id,CurrentUser.get(),false);var rows=db.rows("obtenerDetalleSesion-1",id);rows.forEach(r->{if(r.get("estado")==null)r.put("estado","pendiente");});return obj("sesion",s,"alumnos",rows);}
    @PostMapping("/asistencia/manual") @ResponseStatus(HttpStatus.CREATED) @Transactional public Map<String,Object> manual(@RequestBody Map<String,Object>b){
        var u=CurrentUser.get();UUID id=uuid(b.get("sesion_id")),student=uuid(b.get("alumno_id"));if(b.get("estado")!=null&&!"presente".equals(b.get("estado")))throw error(400,"El registro manual solo puede marcar presente.");sessions.active(sessions.access(id,u,true));
        if(db.rows("registrarManual-1",id,student).isEmpty())throw error(404,"El alumno no tiene matrícula activa en este curso.");var a=required(db.rows("registrarManual-2",id,student,u.id()),409,"Esta asistencia ya tiene una justificación aprobada.");
        db.update("registrarManual-3",u.id(),a.get("id").toString(),json(obj("motivo",b.get("motivo"),"estado","presente")));live.publish(id,"asistencia_actualizada");return obj("asistencia",a);
    }
    @PostMapping("/asistencia/checkin-docente") @Transactional public ResponseEntity<?> checkin(@RequestBody Map<String,Object>b){
        var u=CurrentUser.get();UUID id=uuid(b.get("sesion_id"));sessions.active(sessions.access(id,u,true));var existing=db.rows("checkinDocente-1",u.id(),id.toString());if(!existing.isEmpty())return ResponseEntity.ok(obj("registrado_en",existing.get(0).get("registrado_en"),"ya_registrado",true));var now=Instant.now();db.update("checkinDocente-2",u.id(),id.toString(),json(obj("registrado_en",now)));return ResponseEntity.status(201).body(obj("registrado_en",now));
    }
    @GetMapping("/asistencia/sesion/{id}/checkin-docente") public Map<String,Object> checkinStatus(@PathVariable UUID id){var u=CurrentUser.get();sessions.access(id,u,false);var rows=db.rows("obtenerCheckinDocente-1",u.id(),id.toString());return obj("registrado",!rows.isEmpty(),"registrado_en",rows.isEmpty()?null:rows.get(0).get("registrado_en"));}
    @PostMapping("/asistencia/sesion/{id}/cerrar") @Transactional public Map<String,Object> close(@PathVariable UUID id){var u=CurrentUser.get();sessions.active(sessions.access(id,u,true));sessions.close(id,"manual",u.id());return message("Sesión cerrada correctamente.");}
}

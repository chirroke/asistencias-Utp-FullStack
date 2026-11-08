package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
@RestController
public class JustificationController {
    private final SqlRepository db;
    public JustificationController(SqlRepository db){this.db=db;}
    private CurrentUser reviewer(String role){var u=CurrentUser.get();u.roles(role);return u;}
    @GetMapping("/api/docente/justificaciones") public Map<String,Object> teacherList(){return list(reviewer("docente"));}
    @GetMapping("/api/admin/justificaciones") public Map<String,Object> adminList(){return list(reviewer("admin"));}
    private Map<String,Object> list(CurrentUser u){return obj("justificaciones",db.rows("listarJustificaciones-1",u.rol(),u.id()));}
    @PostMapping("/api/docente/justificaciones/{id}/resolver") @Transactional public Map<String,Object> teacherResolve(@PathVariable UUID id,@RequestBody Map<String,Object>b){return resolve(id,b,reviewer("docente"));}
    @PostMapping("/api/admin/justificaciones/{id}/resolver") @Transactional public Map<String,Object> adminResolve(@PathVariable UUID id,@RequestBody Map<String,Object>b){return resolve(id,b,reviewer("admin"));}
    private Map<String,Object> resolve(UUID id,Map<String,Object>b,CurrentUser u){
        String decision=str(b,"decision"),comment=str(b,"comentario");if(!Set.of("aprobada","rechazada").contains(decision))throw error(400,"La decisión debe ser aprobada o rechazada.");comment=comment.substring(0,Math.min(comment.length(),1000));
        var j=required(db.rows("resolverJustificacion-1",id),404,"No se encontró la justificación.");if(!u.admin()&&!u.id().equals(j.get("docente_id")))throw error(403,"No tienes acceso a esta solicitud.");if(!"pendiente".equals(j.get("estado")))throw error(409,"Esta solicitud ya fue revisada.");
        db.update("resolverJustificacion-2",decision,u.id(),comment,id);boolean approved=decision.equals("aprobada");db.update(approved?"resolverJustificacion-3":"resolverJustificacion-4",id,u.id());
        db.update("resolverJustificacion-5",u.id(),approved?"aprobar_justificacion":"rechazar_justificacion",id.toString(),json(obj("decision",decision,"comentario",comment)));return message(approved?"Justificación aprobada.":"Justificación rechazada.");
    }
    @GetMapping("/api/alumno/justificaciones/{id}/evidencia") public ResponseEntity<byte[]> studentDownload(@PathVariable UUID id){return evidence(id,reviewer("alumno"));}
    @GetMapping("/api/admin/justificaciones/{id}/evidencia") public ResponseEntity<byte[]> adminDownload(@PathVariable UUID id){return evidence(id,reviewer("admin"));}
    @GetMapping("/api/docente/justificaciones/{id}/evidencia") public ResponseEntity<byte[]> teacherDownload(@PathVariable UUID id){return evidence(id,reviewer("docente"));}
    private ResponseEntity<byte[]> evidence(UUID id,CurrentUser u){var f=required(db.rows("descargarEvidencia-1",id),404,"No hay evidencia adjunta.");if(!u.admin()&&!u.id().equals(f.get("alumno_id"))&&!u.id().equals(f.get("docente_id")))throw error(403,"No tienes acceso a este archivo.");return download(f);}
}

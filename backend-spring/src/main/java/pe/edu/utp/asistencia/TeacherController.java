package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/docente")
public class TeacherController {
    private final SqlRepository db;
    public TeacherController(SqlRepository db){this.db=db;}
    @PostMapping("/incidencias") @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> report(@RequestParam Map<String,String>b,@RequestParam(required=false)MultipartFile evidencia){
        var u=CurrentUser.get();u.roles("docente");UUID sid=uuid(b.get("sesion_id"));String type=str(b,"tipo"),description=text(b,"descripcion");if(!Set.of("falla_pc","problema_red","otro").contains(type)||description.length()<5)throw error(400,"Completa el tipo y la descripción de la incidencia.");byte[] bytes=file(evidencia,false);
        if(db.rows("reportarIncidencia-1",sid,u.id()).isEmpty())throw error(404,"No hay una sesión activa tuya para asociar esta incidencia.");var row=db.rows("reportarIncidencia-2",u.id(),sid,type,description,filename(evidencia),evidencia.getContentType(),bytes).get(0);return obj("message","Incidencia enviada al administrador para verificación.","incidencia",row);
    }
}

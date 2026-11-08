package pe.edu.utp.asistencia;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.scheduling.annotation.Scheduled;
@Service
public class SessionService {
    private final SqlRepository db;private final TransactionTemplate tx;private final LiveAttendance live;
    public SessionService(SqlRepository db,TransactionTemplate tx,LiveAttendance live){this.db=db;this.tx=tx;this.live=live;}
    public Map<String,Object> access(UUID id,CurrentUser user,boolean lock){
        user.roles("docente","admin");
        if(lock)db.query("SELECT id FROM sesion_clase WHERE id=:p1 FOR UPDATE",id);
        var row=required(db.rows("verificarAccesoSesion-1",id),404,"Sesión no encontrada.");
        if(!user.admin()&&!user.id().equals(row.get("docente_id")))throw error(403,"No tienes acceso a esta sesión.");return row;
    }
    public void active(Map<String,Object> s){if(!"activa".equals(s.get("estado")))throw error(409,"La sesión ya está cerrada.");}
    public void close(UUID id,String type,UUID by){
        var row=required(db.query("SELECT estado FROM sesion_clase WHERE id=:p1 FOR UPDATE",id),404,"Sesión no encontrada.");
        if(!"activa".equals(row.get("estado")))return;
        db.update("cerrarSesionInterna-1",id);db.update("cerrarSesionInterna-2",id,type,by);live.publish(id,"sesion_cerrada");
    }
    @Scheduled(fixedDelayString="${app.auto-close-ms}") public void closeExpired(){
        try{for(var row:db.query("SELECT id FROM sesion_clase WHERE estado='activa' AND hora_fin_programada < now()"))tx.executeWithoutResult(s->close((UUID)row.get("id"),"automatico",null));}
        catch(Exception ex){org.slf4j.LoggerFactory.getLogger(getClass()).error("No se pudieron cerrar sesiones vencidas",ex);}
    }
}

package pe.edu.utp.asistencia;

import static pe.edu.utp.asistencia.Api.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/docente")
public class ReprogramacionController {
    private final SqlRepository db;
    public ReprogramacionController(SqlRepository db){this.db=db;}

    @PostMapping("/cursos/{cursoId}/reprogramar") @Transactional
    public Map<String,Object> reprogramar(@PathVariable UUID cursoId,@RequestBody Map<String,Object> body){
        var user=CurrentUser.get();user.roles("docente");
        UUID destinoId=uuid(body.get("cursoDestinoId"));
        LocalDate fecha;LocalTime inicio,fin;
        try{fecha=LocalDate.parse(text(body,"fecha"));inicio=LocalTime.parse(text(body,"horaInicio"));fin=LocalTime.parse(text(body,"horaFin"));}
        catch(Exception ex){throw error(400,"La fecha y el horario deben tener un formato válido.");}
        String motivo=text(body,"motivo");
        if(!fecha.isAfter(LocalDate.now())||!inicio.isBefore(fin))throw error(400,"La nueva fecha debe ser futura y el horario válido.");
        if(motivo.length()<8||motivo.length()>1000)throw error(400,"Describe el motivo con al menos 8 caracteres.");

        var origen=required(db.query("SELECT id,codigo,docente_id,periodo_id FROM curso WHERE id=:p1 AND eliminado_en IS NULL FOR UPDATE",cursoId),404,"No se encontró la sección de origen.");
        if(!user.id().toString().equals(origen.get("docente_id").toString()))throw error(403,"No tienes acceso a este curso.");
        var destino=required(db.query("SELECT id,codigo,seccion,docente_id,periodo_id,tolerancia_marcado_min,tolerancia_tardanza_min FROM curso WHERE id=:p1 AND eliminado_en IS NULL",destinoId),404,"No se encontró la sección destino.");
        if(!user.id().toString().equals(destino.get("docente_id").toString())||!origen.get("codigo").equals(destino.get("codigo"))||cursoId.equals(destinoId)||!origen.get("periodo_id").equals(destino.get("periodo_id")))throw error(400,"El destino debe ser otra sección del mismo curso y periodo asignada a ti.");
        if(db.query("SELECT 1 FROM periodo_academico WHERE id=:p1 AND activo=TRUE",origen.get("periodo_id")).isEmpty())throw error(409,"El periodo académico no está activo.");

        UUID nuevaSesion=UUID.randomUUID();
        var anterior=required(db.query("SELECT id,fecha,hora_inicio,hora_fin_programada FROM sesion_clase WHERE curso_id=:p1 AND estado='programada' AND fecha>=CURRENT_DATE AND NOT EXISTS(SELECT 1 FROM reprogramacion r WHERE r.sesion_anterior_id=sesion_clase.id) ORDER BY fecha,hora_inicio,id LIMIT 1 FOR UPDATE",cursoId),409,"No hay una clase futura pendiente de reprogramar en esta sección.");
        OffsetDateTime nuevoInicio=fecha.atTime(inicio).atZone(ZoneId.of("America/Lima")).toOffsetDateTime();
        OffsetDateTime nuevoFin=fecha.atTime(fin).atZone(ZoneId.of("America/Lima")).toOffsetDateTime();
        if(!db.query("SELECT 1 FROM sesion_clase WHERE curso_id=:p1 AND fecha=:p2 AND estado='programada' AND hora_inicio < :p3 AND hora_fin_programada > :p4",destinoId,fecha,nuevoFin,nuevoInicio).isEmpty())throw error(409,"La sección destino ya tiene una clase programada en ese horario.");

        db.execute("UPDATE sesion_clase SET estado='reprogramada',actualizado_en=now(),actualizado_por=:p1 WHERE id=:p2 AND estado='programada'",user.id(),anterior.get("id"));
        db.execute("INSERT INTO sesion_clase(id,curso_id,fecha,hora_inicio,hora_fin_programada,estado,tolerancia_marcado_min,tolerancia_tardanza_min,creado_por) VALUES(:p1,:p2,:p3,:p4,:p5,'programada',:p6,:p7,:p8)",nuevaSesion,destinoId,fecha,nuevoInicio,nuevoFin,destino.get("tolerancia_marcado_min"),destino.get("tolerancia_tardanza_min"),user.id());
        UUID registro=UUID.randomUUID();
        db.execute("INSERT INTO reprogramacion(id,sesion_anterior_id,sesion_nueva_id,docente_id,motivo) VALUES(:p1,:p2,:p3,:p4,:p5)",registro,anterior.get("id"),nuevaSesion,user.id(),motivo);
        db.execute("INSERT INTO bitacora_auditoria(usuario_id,accion,entidad,entidad_id,datos_despues) VALUES(:p1,'actualizar','sesion_clase',:p2,CAST(:p3 AS jsonb))",user.id(),anterior.get("id").toString(),json(obj("accion","reprogramar_sesion","sesionNuevaId",nuevaSesion,"cursoDestinoId",destinoId,"fecha",fecha,"horaInicio",inicio,"horaFin",fin,"motivo",motivo)));
        return obj("mensaje","Clase reprogramada. La sesión original se conserva en el historial.","reprogramacionId",registro,"sesionAnteriorId",anterior.get("id"),"sesionNuevaId",nuevaSesion,"seccionDestino",destino.get("seccion"),"fecha",fecha);
    }

    @GetMapping("/reprogramaciones")
    public List<Map<String,Object>> historial(){
        var user=CurrentUser.get();user.roles("docente");
        return db.query("SELECT r.id,r.sesion_anterior_id,r.sesion_nueva_id,r.motivo,r.solicitada_en,c1.codigo,c1.nombre,c1.seccion AS seccion_origen,c2.seccion AS seccion_destino,s2.fecha,s2.hora_inicio,s2.hora_fin_programada FROM reprogramacion r JOIN sesion_clase s1 ON s1.id=r.sesion_anterior_id JOIN sesion_clase s2 ON s2.id=r.sesion_nueva_id JOIN curso c1 ON c1.id=s1.curso_id JOIN curso c2 ON c2.id=s2.curso_id WHERE r.docente_id=:p1 ORDER BY r.solicitada_en DESC LIMIT 50",user.id()).stream().map(r->obj("id",r.get("id"),"sesionAnteriorId",r.get("sesion_anterior_id"),"sesionNuevaId",r.get("sesion_nueva_id"),"motivo",r.get("motivo"),"solicitadaEn",r.get("solicitada_en"),"codigo",r.get("codigo"),"nombre",r.get("nombre"),"seccionOrigen",r.get("seccion_origen"),"seccionDestino",r.get("seccion_destino"),"fecha",r.get("fecha"),"horaInicio",r.get("hora_inicio"),"horaFin",r.get("hora_fin_programada"))).toList();
    }
}

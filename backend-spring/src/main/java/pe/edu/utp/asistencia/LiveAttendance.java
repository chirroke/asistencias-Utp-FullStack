package pe.edu.utp.asistencia;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.http.server.*;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.transaction.support.*;

@Configuration @EnableWebSocket
public class LiveAttendance extends TextWebSocketHandler implements WebSocketConfigurer {
    private final Tokens tokens;private final UsuarioRepository users;private final SqlRepository db;
    private final Map<String,WebSocketSession> clients=new ConcurrentHashMap<>();
    @Value("${app.cors-origins}") private String origins;
    public LiveAttendance(Tokens tokens,UsuarioRepository users,SqlRepository db){this.tokens=tokens;this.users=users;this.db=db;}
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry){
        registry.addHandler(this,"/ws/asistencia").setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new)).addInterceptors(new HandshakeInterceptor(){
            public boolean beforeHandshake(ServerHttpRequest req,ServerHttpResponse res,WebSocketHandler handler,Map<String,Object> attributes){
                try{String value=UriComponentsBuilder.fromUri(req.getURI()).build().getQueryParams().getFirst("ticket");var jwt=tokens.decode(value);
                    if(!"asistencia:live".equals(jwt.getClaimAsString("scope")))return false;
                    UUID uid=UUID.fromString(jwt.getClaimAsString("id")),sid=UUID.fromString(jwt.getClaimAsString("sesionId"));var user=users.findByIdAndActivoTrue(uid).orElseThrow();
                    var rows=db.rows("verificarAccesoSesion-1",sid);if(rows.isEmpty()||!"activa".equals(rows.get(0).get("estado")))return false;
                    if(!user.rol.equals("admin")&&(!user.rol.equals("docente")||!uid.equals(rows.get(0).get("docente_id"))))return false;
                    attributes.put("sesionId",sid.toString());return true;
                }catch(Exception ex){res.setStatusCode(org.springframework.http.HttpStatus.FORBIDDEN);return false;}
            }
            public void afterHandshake(ServerHttpRequest req,ServerHttpResponse res,WebSocketHandler handler,Exception ex){}
        });
    }
    @Override public void afterConnectionEstablished(WebSocketSession session){clients.put(session.getId(),session);}
    @Override public void afterConnectionClosed(WebSocketSession session,CloseStatus status){clients.remove(session.getId());}
    public void publish(UUID id,String type){
        Runnable send=()->{var payload=new TextMessage(Api.json(Api.obj("type",type,"sesionId",id)));for(var client:clients.values())if(id.toString().equals(client.getAttributes().get("sesionId")))try{synchronized(client){if(client.isOpen())client.sendMessage(payload);}}catch(Exception ex){clients.remove(client.getId());}};
        if(TransactionSynchronizationManager.isSynchronizationActive())TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){send.run();}});else send.run();
    }
}

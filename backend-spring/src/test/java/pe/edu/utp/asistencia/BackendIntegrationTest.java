package pe.edu.utp.asistencia;
import static org.junit.jupiter.api.Assertions.*;
import static pe.edu.utp.asistencia.Api.*;
import java.util.*;
import java.net.*;
import java.net.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.fasterxml.jackson.databind.*;
import static org.mockito.Mockito.*;

/** Runs only with explicit opt-in against a disposable database ending in _test. */
@EnabledIfEnvironmentVariable(named="RUN_POSTGRES_TESTS",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "app.jwt-secret=integration-tests-only-secret-32-characters-long",
    "app.reset-secret=integration-reset-test-secret",
    "app.auto-close-ms=3600000","spring.mail.host=localhost","spring.mail.username=test","spring.mail.password=test","app.mail-from=test@localhost"})
@TestInstance(TestInstance.Lifecycle.PER_CLASS) @TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BackendIntegrationTest {
    @LocalServerPort int port;
    @Autowired SqlRepository db;
    @Autowired BCryptPasswordEncoder passwords;
    @Autowired SessionService sessions;
    @MockitoBean JavaMailSender mail;
    final ObjectMapper mapper=new ObjectMapper();final HttpClient http=HttpClient.newHttpClient();
    UUID admin,teacher,otherTeacher,student,absent,outsider,course,period,session;
    String adminToken,teacherToken,otherToken,studentToken,absentToken,outsiderToken,qr,incident,justification;
    final String prefix="it"+UUID.randomUUID().toString().substring(0,8),password="Ensayo482!";
    final byte[] jpeg={(byte)255,(byte)216,(byte)255,0,1,2,3};
    final byte[] pdf="%PDF-1.4\nsynthetic test evidence\n%%EOF".getBytes(StandardCharsets.UTF_8);
    record Result(int status,JsonNode json,byte[] bytes){}
    Result request(String method,String path,String token,Object body,int status)throws Exception{
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path));if(token!=null)builder.header("Authorization","Bearer "+token);
        builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(Api.json(body))).header("Content-Type","application/json");
        var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofByteArray());assertEquals(status,response.statusCode(),method+" "+path+" "+new String(response.body(),StandardCharsets.UTF_8));
        JsonNode json=null;try{json=mapper.readTree(response.body());}catch(Exception ignored){}return new Result(response.statusCode(),json,response.body());
    }
    Result upload(String path,String token,Map<String,String>fields,String field,String mime,byte[] bytes,int status)throws Exception{
        String boundary="Boundary"+UUID.randomUUID();var data=new ByteArrayOutputStream();
        for(var e:fields.entrySet())data.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+e.getKey()+"\"\r\n\r\n"+e.getValue()+"\r\n").getBytes(StandardCharsets.UTF_8));
        data.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+field+"\"; filename=\"test.bin\"\r\nContent-Type: "+mime+"\r\n\r\n").getBytes(StandardCharsets.UTF_8));data.write(bytes);data.write(("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8));
        var req=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Authorization","Bearer "+token).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(data.toByteArray())).build();var response=http.send(req,HttpResponse.BodyHandlers.ofByteArray());assertEquals(status,response.statusCode(),path+" "+new String(response.body(),StandardCharsets.UTF_8));return new Result(status,mapper.readTree(response.body()),response.body());
    }
    UUID user(String suffix,String role){UUID id=UUID.randomUUID();db.execute("INSERT INTO usuario(id,correo,contrasena_hash,nombres,apellidos,rol) VALUES(:p1,:p2,:p3,'Prueba','Migracion',:p4)",id,prefix+suffix+"@utp.edu.pe",passwords.encode(password),role);if(role.equals("alumno"))db.execute("INSERT INTO alumno(usuario_id,codigo_alumno) VALUES(:p1,:p2)",id,prefix+suffix);return id;}
    String login(String suffix)throws Exception{return request("POST","/api/auth/login",null,obj("correo",prefix+suffix+"@utp.edu.pe","contrasena",password),200).json.path("token").asText();}
    @BeforeAll void seed(){
        String dbName=db.query("SELECT current_database() AS name").get(0).get("name").toString();assertTrue(dbName.endsWith("_test"),"Use a disposable database ending in _test");
        admin=user("a","admin");teacher=user("t","docente");otherTeacher=user("o","docente");student=user("s","alumno");absent=user("b","alumno");outsider=user("x","alumno");period=UUID.randomUUID();course=UUID.randomUUID();
        db.execute("INSERT INTO periodo_academico(id,codigo,fecha_inicio,fecha_fin,activo) VALUES(:p1,:p2,CURRENT_DATE,CURRENT_DATE+120,true)",period,prefix);
        db.execute("INSERT INTO curso(id,periodo_id,docente_id,codigo,nombre,seccion,tolerancia_marcado_min,tolerancia_tardanza_min,umbral_riesgo_pct,capacidad_alumnos) VALUES(:p1,:p2,:p3,'IT-101','Curso de prueba','T',10,10,20,5)",course,period,teacher);
        for(UUID id:List.of(student,absent))db.execute("INSERT INTO matricula(curso_id,alumno_id,estado) VALUES(:p1,:p2,'activa')",course,id);
    }
    @Test @Order(1) void authenticationAndRoles()throws Exception{
        var loginPage=request("GET","/login",null,null,200);assertTrue(new String(loginPage.bytes,StandardCharsets.UTF_8).contains("<div id=\"root\""));
        request("GET","/docente/dashboard",null,null,200);
        request("GET","/api/health",null,null,200);request("GET","/api/admin/resumen",null,null,401);
        request("POST","/api/auth/login",null,obj("correo",prefix+"a@utp.edu.pe","contrasena","incorrecta"),401);
        adminToken=login("a");teacherToken=login("t");otherToken=login("o");studentToken=login("s");absentToken=login("b");outsiderToken=login("x");
        assertEquals("docente",request("GET","/api/auth/perfil",teacherToken,null,200).json.path("usuario").path("rol").asText());
        request("GET","/api/admin/resumen",studentToken,null,403);request("GET","/api/alumno/resumen",teacherToken,null,403);
        assertTrue(request("GET","/api/cursos",teacherToken,null,200).json.size()>0);
    }
    @Test @Order(2) void concurrentOpenAndQrOwnership()throws Exception{
        var pool=Executors.newFixedThreadPool(4);try{List<Future<Result>> futures=new ArrayList<>();for(int i=0;i<4;i++)futures.add(pool.submit(()->{
            var req=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/asistencia/abrir-sesion")).header("Authorization","Bearer "+teacherToken).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(Api.json(obj("curso_id",course)))).build();var r=http.send(req,HttpResponse.BodyHandlers.ofByteArray());assertTrue(r.statusCode()==200||r.statusCode()==201,new String(r.body()));return new Result(r.statusCode(),mapper.readTree(r.body()),r.body());}));Set<String> ids=new HashSet<>();int created=0;for(var f:futures){var r=f.get();ids.add(r.json.path("sesion").path("id").asText());if(r.status==201)created++;}assertEquals(1,ids.size());assertEquals(1,created);session=UUID.fromString(ids.iterator().next());}finally{pool.shutdownNow();}
        request("POST","/api/asistencia/generar-qr",otherToken,obj("sesion_id",session),403);
        request("POST","/api/asistencia/generar-qr",teacherToken,obj("sesion_id",session,"duracion_segundos",1),400);
        qr=request("POST","/api/asistencia/generar-qr",teacherToken,obj("sesion_id",session,"duracion_segundos",60),200).json.path("qr_code").asText();
        request("POST","/api/asistencia/checkin-docente",teacherToken,obj("sesion_id",session),201);request("POST","/api/asistencia/checkin-docente",teacherToken,obj("sesion_id",session),200);
        assertTrue(request("GET","/api/asistencia/sesion/"+session+"/checkin-docente",teacherToken,null,200).json.path("registrado").asBoolean());
        request("GET","/api/asistencia/sesion/"+session+"/detalle",otherToken,null,403);
    }
    @Test @Order(3) void faceQrValidationAndWebSocket()throws Exception{
        String face=Api.json(new double[128]);upload("/api/alumno/perfil/rostro",studentToken,Map.of("embedding",face),"selfie","image/jpeg",new byte[]{1,2},400);
        upload("/api/alumno/perfil/rostro",studentToken,Map.of("embedding","[0]"),"selfie","image/jpeg",jpeg,400);
        upload("/api/alumno/perfil/rostro",studentToken,Map.of("embedding",face),"selfie","image/jpeg",jpeg,200);
        assertTrue(request("GET","/api/auth/perfil",studentToken,null,200).json.path("usuario").path("embeddingRegistrado").asBoolean());
        upload("/api/alumno/asistencia/escanear",outsiderToken,Map.of("qr",qr,"embedding",face),"selfie","image/jpeg",jpeg,403);
        double[] wrong=new double[128];Arrays.fill(wrong,1);upload("/api/alumno/asistencia/escanear",studentToken,Map.of("qr",qr,"embedding",Api.json(wrong)),"selfie","image/jpeg",jpeg,403);
        var ticket=request("GET","/api/asistencia/sesion/"+session+"/ws-ticket",teacherToken,null,200).json.path("ticket").asText();var received=new CountDownLatch(1);var message=new AtomicReference<String>();
        var ws=http.newWebSocketBuilder().buildAsync(URI.create("ws://127.0.0.1:"+port+"/ws/asistencia?ticket="+ticket),new WebSocket.Listener(){public void onOpen(WebSocket socket){socket.request(1);}public CompletionStage<?> onText(WebSocket socket,CharSequence text,boolean last){message.set(text.toString());received.countDown();socket.request(1);return null;}}).get(10,TimeUnit.SECONDS);
        try{qr=request("POST","/api/asistencia/generar-qr",teacherToken,obj("sesion_id",session,"duracion_segundos",60),200).json.path("qr_code").asText();upload("/api/alumno/asistencia/escanear",studentToken,Map.of("qr",qr,"embedding",face),"selfie","image/jpeg",jpeg,201);assertTrue(received.await(5,TimeUnit.SECONDS));assertTrue(message.get().contains("asistencia_actualizada"));}finally{ws.sendClose(1000,"done").join();}
        upload("/api/alumno/asistencia/escanear",studentToken,Map.of("qr",qr,"embedding",face),"selfie","image/jpeg",jpeg,409);
        var rows=request("GET","/api/asistencia/sesion/"+session+"/asistencia-vivo",teacherToken,null,200).json.path("alumnos");assertEquals(2,rows.size());assertTrue(rows.toString().contains("data:image/jpeg;base64,"));
    }
    @Test @Order(4) void incidentsAndManualAttendance()throws Exception{
        request("POST","/api/asistencia/manual",teacherToken,obj("sesion_id",session,"alumno_id",outsider),404);
        request("POST","/api/asistencia/manual",teacherToken,obj("sesion_id",session,"alumno_id",student,"estado","falta"),400);
        request("POST","/api/asistencia/manual",teacherToken,obj("sesion_id",session,"alumno_id",student,"motivo","Verificacion"),201);
        incident=upload("/api/docente/incidencias",teacherToken,Map.of("sesion_id",session.toString(),"tipo","falla_pc","descripcion","Equipo de prueba sin conexión"),"evidencia","application/pdf",pdf,201).json.path("incidencia").path("id").asText();
        request("GET","/api/admin/incidencias-docentes",adminToken,null,200);assertArrayEquals(pdf,request("GET","/api/admin/incidencias-docentes/"+incident+"/evidencia",adminToken,null,200).bytes);
        request("POST","/api/admin/incidencias-docentes/"+incident+"/resolver",adminToken,obj("decision","aprobada"),200);request("POST","/api/admin/incidencias-docentes/"+incident+"/resolver",adminToken,obj("decision","aprobada"),404);
    }
    @Test @Order(5) void closingAndJustificationWorkflow()throws Exception{
        request("POST","/api/asistencia/sesion/"+session+"/cerrar",teacherToken,obj(),200);request("POST","/api/asistencia/sesion/"+session+"/cerrar",teacherToken,obj(),409);
        assertEquals("falta",db.query("SELECT estado FROM asistencia WHERE sesion_id=:p1 AND alumno_id=:p2",session,absent).get(0).get("estado"));
        request("GET","/api/asistencia/cursos/"+course+"/historial",teacherToken,null,200);request("GET","/api/asistencia/cursos/"+course+"/historial?desde=no-fecha",teacherToken,null,400);
        var summary=request("GET","/api/alumno/resumen",absentToken,null,200).json;assertEquals(1,summary.path("resumen").path("faltas").asInt());String attendance=summary.path("faltasJustificables").get(0).path("asistencia_id").asText();
        var fields=Map.of("asistencia_id",attendance,"motivo","Ausencia por motivo de prueba");justification=upload("/api/alumno/justificaciones",absentToken,fields,"evidencia","application/pdf",pdf,201).json.path("id").asText();upload("/api/alumno/justificaciones",absentToken,fields,"evidencia","application/pdf",pdf,409);
        request("GET","/api/docente/justificaciones",teacherToken,null,200);request("GET","/api/admin/justificaciones",adminToken,null,200);
        assertArrayEquals(pdf,request("GET","/api/docente/justificaciones/"+justification+"/evidencia",teacherToken,null,200).bytes);
        request("GET","/api/alumno/justificaciones/"+justification+"/evidencia",outsiderToken,null,403);request("GET","/api/admin/justificaciones/"+justification+"/evidencia",adminToken,null,200);
        request("POST","/api/docente/justificaciones/"+justification+"/resolver",otherToken,obj("decision","aprobada"),403);
        request("POST","/api/docente/justificaciones/"+justification+"/resolver",teacherToken,obj("decision","aprobada"),200);
        request("POST","/api/admin/justificaciones/"+justification+"/resolver",adminToken,obj("decision","rechazada"),409);
        assertEquals("justificada",db.query("SELECT estado FROM asistencia WHERE id=:p1",UUID.fromString(attendance)).get(0).get("estado"));
    }
    @Test @Order(6) void administrationAndAccountDeactivation()throws Exception{
        for(String path:List.of("docentes","alumnos","cursos","resumen"))request("GET","/api/admin/"+path,adminToken,null,200);
        var data=obj("nombres","Nuevo","apellidos","Estudiante","correo",prefix+"new@utp.edu.pe","codigo_alumno",prefix+"NEW","contrasena",password,"curso_id",course);
        String newId=request("POST","/api/admin/alumnos",adminToken,data,201).json.path("id").asText();request("POST","/api/admin/alumnos",adminToken,data,409);
        request("POST","/api/admin/alumnos/"+newId+"/cursos/"+course+"/retirar",adminToken,obj(),200);request("POST","/api/admin/alumnos/"+newId+"/cursos/"+course+"/retirar",adminToken,obj(),404);
        request("PATCH","/api/admin/docentes/"+teacher+"/estado",adminToken,obj("activo",false),200);request("GET","/api/auth/perfil",teacherToken,null,401);request("POST","/api/auth/login",null,obj("correo",prefix+"t@utp.edu.pe","contrasena",password),401);request("PATCH","/api/admin/docentes/"+teacher+"/estado",adminToken,obj("activo",true),200);
    }
    @Test @Order(7) void recoveryAttemptsSingleUseAndChangePassword()throws Exception{
        AtomicReference<String> sent=new AtomicReference<>();doAnswer(call->{SimpleMailMessage msg=call.getArgument(0);sent.set(msg.getText());return null;}).when(mail).send(any(SimpleMailMessage.class));
        var email=prefix+"x@utp.edu.pe";request("POST","/api/auth/recuperacion/solicitar",null,obj("correo",email),200);assertNotNull(sent.get());var matcher=java.util.regex.Pattern.compile("\\b\\d{6}\\b").matcher(sent.get());assertTrue(matcher.find());String code=matcher.group();
        String wrong=code.equals("000000")?"999999":"000000";request("POST","/api/auth/recuperacion/verificar",null,obj("correo",email,"codigo",wrong),400);assertEquals(1,number(db.query("SELECT intentos FROM password_reset_code WHERE usuario_id=:p1",outsider).get(0).get("intentos")));
        String token=request("POST","/api/auth/recuperacion/verificar",null,obj("correo",email,"codigo",code),200).json.path("token").asText();request("POST","/api/auth/recuperacion/verificar",null,obj("correo",email,"codigo",code),400);
        request("POST","/api/auth/recuperacion/restablecer",null,obj("token",token,"contrasena","ClaveNueva73!"),200);request("POST","/api/auth/recuperacion/restablecer",null,obj("token",token,"contrasena",password),400);
        String fresh=request("POST","/api/auth/login",null,obj("correo",email,"contrasena","ClaveNueva73!"),200).json.path("token").asText();request("POST","/api/auth/cambiar-contrasena",fresh,obj("actual","ClaveNueva73!","nueva",password),200);
    }
    @Test @Order(8) void automaticCloseAndExpiredQr()throws Exception{
        String newSession=request("POST","/api/asistencia/abrir-sesion",teacherToken,obj("curso_id",course),201).json.path("sesion").path("id").asText();UUID sid=UUID.fromString(newSession);
        var payload=request("POST","/api/asistencia/generar-qr",teacherToken,obj("sesion_id",sid),200).json.path("qr_code").asText();db.execute("UPDATE sesion_clase SET expira_en=now()-interval '1 second' WHERE id=:p1",sid);
        upload("/api/alumno/asistencia/escanear",studentToken,Map.of("qr",payload,"embedding",Api.json(new double[128])),"selfie","image/jpeg",jpeg,410);
        db.execute("UPDATE sesion_clase SET hora_fin_programada=now()-interval '1 second' WHERE id=:p1",sid);sessions.closeExpired();assertEquals("cerrada",db.query("SELECT estado FROM sesion_clase WHERE id=:p1",sid).get(0).get("estado"));assertEquals(2,number(db.query("SELECT COUNT(*) AS total FROM asistencia WHERE sesion_id=:p1 AND estado='falta'",sid).get(0).get("total")));
    }
}

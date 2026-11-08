package pe.edu.utp.asistencia;
import java.util.*;
import java.nio.charset.StandardCharsets;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
/** Helpers for the existing React JSON contract, including nullable fields. */
public final class Api {
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private Api() {}
    public static Map<String,Object> obj(Object... fields) {
        Map<String,Object> result=new LinkedHashMap<>();
        for(int i=0;i<fields.length;i+=2) result.put((String)fields[i],fields[i+1]); return result;
    }
    public static String str(Map<String,?> data,String key) { Object v=data.get(key); return v==null?"":v.toString(); }
    public static String text(Map<String,?> data,String key) {return str(data,key).trim();}
    public static UUID uuid(Object v) {try{return UUID.fromString(String.valueOf(v));}catch(Exception ex){throw error(400,"Identificador inválido.");}}
    public static ResponseStatusException error(int code,String message) {return new ResponseStatusException(HttpStatus.valueOf(code),message);}
    public static Map<String,Object> required(List<Map<String,Object>> rows,int status,String message) {if(rows.isEmpty())throw error(status,message);return rows.get(0);}
    public static double number(Object v) {return v==null?0:Double.parseDouble(v.toString());}
    public static String json(Object data) {try{return JSON.writeValueAsString(data);}catch(Exception ex){throw new IllegalArgumentException(ex);}}
    public static Map<String,Object> parse(String value) {
        try{return JSON.readValue(value,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});}catch(Exception ex){throw error(400,"Contenido JSON inválido.");}
    }
    public static double[] embedding(String value) {
        try{var array=JSON.readTree(value);if(!array.isArray()||array.size()!=128)throw new IllegalArgumentException();double[] result=new double[128];
            for(int i=0;i<128;i++){if(!array.get(i).isNumber())throw new IllegalArgumentException();result[i]=array.get(i).doubleValue();if(!Double.isFinite(result[i])||result[i]<-1||result[i]>1)throw new IllegalArgumentException();}return result;
        }catch(Exception ex){throw error(400,"Patrón facial inválido. Vuelve a capturar tu rostro.");}
    }
    public static double faceDistance(double[] a,double[] b) {double sum=0;for(int i=0;i<128;i++)sum+=Math.pow(a[i]-b[i],2);return Math.sqrt(sum);}
    public static byte[] file(MultipartFile file,boolean selfie) {
        if(file==null||file.isEmpty()||file.getSize()>(selfie?500L*1024:5L*1024*1024))throw error(400,"Adjunta un archivo válido dentro del tamaño permitido.");
        try{byte[] bytes=file.getBytes();String mime=file.getContentType();
            boolean jpeg=bytes.length>=3&&(bytes[0]&255)==255&&(bytes[1]&255)==216&&(bytes[2]&255)==255;
            boolean valid="image/jpeg".equals(mime)&&jpeg;
            if(!selfie)valid|="application/pdf".equals(mime)&&bytes.length>=5&&new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-")||"image/png".equals(mime)&&bytes.length>=8&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10});
            if(!valid)throw error(400,selfie?"La selfie debe ser una imagen JPEG válida.":"Adjunta PDF, JPG o PNG con contenido válido.");return bytes;
        }catch(java.io.IOException ex){throw error(400,"No se pudo leer el archivo.");}
    }
    public static String filename(MultipartFile file) {String name=Objects.toString(file.getOriginalFilename(),"evidencia").replaceAll("[\\r\\n\"\\\\]","_");return name.substring(0,Math.min(name.length(),200));}
    public static ResponseEntity<byte[]> download(Map<String,Object> data) {
        byte[] bytes=(byte[])data.get("archivo_contenido");if(bytes==null)throw error(404,"No hay evidencia adjunta.");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(str(data,"archivo_mime"))).header("Content-Disposition",ContentDisposition.inline().filename(str(data,"archivo_nombre"),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").body(bytes);
    }
    public static Map<String,Object> message(String text) {return obj("message",text);}
}

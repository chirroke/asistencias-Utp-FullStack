package pe.edu.utp.asistencia;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> expected(ResponseStatusException ex){return ResponseEntity.status(ex.getStatusCode()).body(Api.obj("error",ex.getReason()));}
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class,org.springframework.web.bind.MissingServletRequestParameterException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,MaxUploadSizeExceededException.class})
    ResponseEntity<?> invalid(Exception ex){return ResponseEntity.badRequest().body(Api.obj("error","Datos inválidos o archivo demasiado grande."));}
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<?> conflict(Exception ex){return ResponseEntity.status(409).body(Api.obj("error","Los datos ya existen, superan el aforo o no cumplen las reglas de la base de datos."));}
    @ExceptionHandler(Exception.class) ResponseEntity<?> unexpected(Exception ex){org.slf4j.LoggerFactory.getLogger(getClass()).error("Error en la API",ex);return ResponseEntity.internalServerError().body(Api.obj("error","No se pudo completar la operación."));}
}

package pe.edu.utp.asistencia;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
public record CurrentUser(UUID id,String rol,String correo) {
    public static CurrentUser get(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!(a.getPrincipal() instanceof CurrentUser u))throw Api.error(401,"Inicia sesión.");return u;}
    public void roles(String... allowed){for(String role:allowed)if(role.equals(rol))return;throw Api.error(403,"No tienes permisos para este recurso.");}
    public boolean admin(){return rol.equals("admin");}
}

package pe.edu.utp.asistencia;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
/** React owns these browser routes; API and assets keep their normal handlers. */
@Controller
public class FrontendController {
    @GetMapping({"/","/login","/docente/**","/alumno/**","/admin/**","/cuenta/**"})
    public String index(){return "forward:/index.html";}
}

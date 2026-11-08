package pe.edu.utp.asistencia;
import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
@Configuration
public class SecurityConfig {
    @Bean BCryptPasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);}
    @Bean SecurityFilterChain security(HttpSecurity http,Tokens tokens,UsuarioRepository users)throws Exception{
        var filter=new OncePerRequestFilter(){
            @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
                String header=req.getHeader("Authorization");
                if(header!=null&&header.startsWith("Bearer ")){try{var jwt=tokens.decode(header.substring(7));if(jwt.hasClaim("scope"))throw new IllegalArgumentException();var user=users.findByIdAndActivoTrue(UUID.fromString(jwt.getClaimAsString("id"))).orElseThrow();var principal=new CurrentUser(user.id,user.rol,user.correo);SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,null,List.of()));}
                    catch(Exception ex){res.setStatus(401);res.setContentType("application/json;charset=UTF-8");res.getWriter().write(Api.json(Api.obj("error","Token inválido, vencido o cuenta inactiva.")));return;}}
                chain.doFilter(req,res);
            }
        };
        return http.csrf(AbstractHttpConfigurer::disable).cors(c->{}).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(org.springframework.http.HttpMethod.OPTIONS,"/**").permitAll().requestMatchers("/api/auth/login","/api/auth/recuperacion/**","/ws/asistencia","/api/health","/error").permitAll().requestMatchers("/api/**").authenticated().anyRequest().permitAll())
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->{res.setStatus(401);res.setContentType("application/json;charset=UTF-8");res.getWriter().write(Api.json(Api.obj("error","Inicia sesión para continuar.")));}))
            .addFilterBefore(filter,UsernamePasswordAuthenticationFilter.class).build();
    }
    @Bean CorsConfigurationSource cors(@Value("${app.cors-origins}")String origins){var c=new CorsConfiguration();c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Authorization","Content-Type"));c.setAllowCredentials(true);var source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;}
}

package pe.edu.utp.asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UsuarioRepository extends JpaRepository<Usuario,UUID> {
    Optional<Usuario> findByCorreoAndActivoTrue(String correo);
    Optional<Usuario> findByIdAndActivoTrue(UUID id);
}

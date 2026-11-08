package pe.edu.utp.asistencia;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="usuario")
public class Usuario {
    @Id public UUID id;
    public String correo;
    @Column(name="contrasena_hash") public String contrasenaHash;
    public String nombres;public String apellidos;public String rol;public boolean activo;
    protected Usuario() {}
}

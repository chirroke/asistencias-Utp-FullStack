package pe.edu.utp.asistencia;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
@Service
public class Tokens {
    private final JwtEncoder encoder;private final JwtDecoder decoder;private final String secret;
    private final SecureRandom random=new SecureRandom();
    public Tokens(@Value("${app.jwt-secret}")String secret){
        if(secret.getBytes(StandardCharsets.UTF_8).length<32)throw new IllegalStateException("JWT_SECRET requiere al menos 32 bytes.");
        this.secret=secret;var key=new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256");
        encoder=new NimbusJwtEncoder(new ImmutableSecret<>(key));decoder=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }
    public String issue(Map<String,Object> claims,long seconds){var b=JwtClaimsSet.builder().issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(seconds));claims.forEach(b::claim);return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),b.build())).getTokenValue();}
    public Jwt decode(String value){var jwt=decoder.decode(value);if(jwt.getExpiresAt()==null||!jwt.getExpiresAt().isAfter(Instant.now()))throw new BadJwtException("Token vencido");return jwt;}
    public String randomToken(){byte[] bytes=new byte[32];random.nextBytes(bytes);return HexFormat.of().formatHex(bytes);}
    public String code(){return String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));}
    public String qr(UUID id){return hmac(secret,id+":"+System.currentTimeMillis()+":"+randomToken()).substring(0,32);}
    public static String hmac(String key,String value){try{var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception ex){throw new IllegalStateException(ex);}}
    public static boolean equal(String a,String b){return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8),b.getBytes(StandardCharsets.UTF_8));}
}

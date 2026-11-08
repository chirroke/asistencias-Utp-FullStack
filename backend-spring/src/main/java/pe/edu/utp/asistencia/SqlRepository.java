package pe.edu.utp.asistencia;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.postgresql.util.PGobject;
/** Parameterized PostgreSQL queries retained from the original backend.
 * JPA account reads and JDBC reports share the datasource and transaction manager. */
@Repository
public class SqlRepository {
    private final NamedParameterJdbcTemplate jdbc;private final ObjectMapper mapper;
    private final Map<String,String> queries=new ConcurrentHashMap<>();
    public SqlRepository(NamedParameterJdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
    private String sql(String name){return queries.computeIfAbsent(name,key->{try(var in=new ClassPathResource("sql/"+key+".sql").getInputStream()){return new String(in.readAllBytes(),StandardCharsets.UTF_8);}catch(Exception ex){throw new IllegalStateException("Consulta inexistente: "+key,ex);}});}
    private MapSqlParameterSource params(Object[] args){var p=new MapSqlParameterSource();for(int i=0;i<args.length;i++)p.addValue("p"+(i+1),args[i]);return p;}
    public List<Map<String,Object>> rows(String name,Object... args){return query(sql(name),args);}
    public int update(String name,Object... args){return execute(sql(name),args);}
    public int execute(String sql,Object... args){return jdbc.update(sql,params(args));}
    public List<Map<String,Object>> query(String sql,Object... args){return jdbc.query(sql,params(args),(rs,row)->{
        Map<String,Object> result=new LinkedHashMap<>();var meta=rs.getMetaData();
        for(int i=1;i<=meta.getColumnCount();i++){Object value=rs.getObject(i);
            if(value instanceof PGobject pg){try{value=Set.of("json","jsonb").contains(pg.getType())?mapper.readValue(pg.getValue(),Object.class):pg.getValue();}catch(Exception ex){throw new SQLException(ex);}}
            else if(value instanceof Timestamp t)value=t.toInstant();else if(value instanceof java.sql.Date d)value=d.toLocalDate();result.put(meta.getColumnLabel(i),value);
        }return result;
    });}
}

SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'sesion_clase'
         AND column_name = 'tolerancia_tardanza_min'

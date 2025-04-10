CREATE OR REPLACE PACKAGE BODY pkg_com_pretius_apex_badge
IS

   /*
    * Plugin:   Pretius APEX Badge
    * Version:  24.2.0
    *
    * License:  MIT License Copyright 2025 Pretius Sp. z o.o. Sp. K.
    * Homepage: 
    * Mail:     apex-plugins@pretius.com
    * Issues:   https://github.com/Pretius/pretius-apex-badge/issues
    *
    * Author:   Matt Mulvaney
    * Mail:     mmulvaney@pretius.com
    * Twitter:  Matt_Mulvaney
    *
    */

  FUNCTION render(
    p_dynamic_action IN apex_plugin.t_dynamic_action,
    p_plugin         IN apex_plugin.t_plugin 
  ) RETURN apex_plugin.t_dynamic_action_render_result
  IS
    v_result              apex_plugin.t_dynamic_action_render_result; 
    l_plugs_row           APEX_APPL_PLUGINS%ROWTYPE;
    l_configuration_test  NUMBER DEFAULT 0;
    c_plugin_name         CONSTANT VARCHAR2(128) DEFAULT 'COM.PRETIUS.APEX.BADGE';
  BEGIN
    -- Debug
    IF apex_application.g_debug 
    THEN
      apex_plugin_util.debug_dynamic_action(p_plugin         => p_plugin,
                                            p_dynamic_action => p_dynamic_action);
    END IF;

    -- Settings
    v_result.attribute_01 := p_dynamic_action.attribute_01; -- Set Type
    v_result.attribute_02 := p_dynamic_action.attribute_02; -- PL/SQL
    v_result.attribute_03 := p_dynamic_action.attribute_03; -- Items to Submit
    v_result.attribute_04 := p_dynamic_action.attribute_04; -- Escape Special Characters
    v_result.attribute_05 := p_dynamic_action.attribute_05; -- JavaScript Expression
    v_result.attribute_06 := p_dynamic_action.attribute_06; -- SQL Query
    v_result.attribute_07 := p_dynamic_action.attribute_07; -- PL/SQL Expression
    v_result.attribute_08 := p_dynamic_action.attribute_08; -- Element attachment
    v_result.attribute_09 := p_dynamic_action.attribute_09; -- h Pos
    v_result.attribute_10 := p_dynamic_action.attribute_10; -- v Pos
    v_result.attribute_11 := p_dynamic_action.attribute_11; -- Spinner
    v_result.attribute_12 := p_dynamic_action.attribute_12; -- Show Zero
    v_result.attribute_13 := p_dynamic_action.attribute_13; -- Custom Attributes
    v_result.attribute_14 := apex_util.prepare_url( p_dynamic_action.attribute_14 ); -- Url
    v_result.attribute_15 := p_dynamic_action.attribute_15; -- CSS Classes
    
    v_result.javascript_function := 
    apex_string.format(
    q'[function render() {
        pnc.render({
            da: this,
            opt: { filePrefix: "%s",
                   ajaxIdentifier: "%s" }
        });
        }]',
    p_plugin.file_prefix,
    apex_plugin.get_ajax_identifier
    );
 
    RETURN v_result;
  
  EXCEPTION
    WHEN OTHERS then
      htp.p( SQLERRM );
      return v_result;
  END render;

  FUNCTION ajax( p_dynamic_action in apex_plugin.t_dynamic_action,
                 p_plugin         in apex_plugin.t_plugin) 
  RETURN apex_plugin.t_dynamic_action_ajax_result
  IS
    -- plugin attributes
    l_result     apex_plugin.t_dynamic_action_ajax_result;
    l_db_result  VARCHAR2( 32767 ) DEFAULT NULL;
    l_set_type   p_dynamic_action.attribute_01%TYPE DEFAULT p_dynamic_action.attribute_01;
    l_plsql_code p_dynamic_action.attribute_02%TYPE DEFAULT p_dynamic_action.attribute_02;  -- PL/SQL Function
    l_sql_query  p_dynamic_action.attribute_06%TYPE DEFAULT p_dynamic_action.attribute_06;  -- SQL Query
    l_plsql_expr p_dynamic_action.attribute_07%TYPE DEFAULT p_dynamic_action.attribute_07; -- PL/SQL Expression
    l_column_value_list   apex_plugin_util.t_column_value_list;
  BEGIN

    -- execute PL/SQL
    CASE l_set_type
    WHEN 'PLSQL_FUNCTION'
    THEN
      l_db_result := apex_plugin_util.get_plsql_function_result(p_plsql_function => l_plsql_code); 
    WHEN 'PLSQL_EXPRESSION'
    THEN
      l_db_result := apex_plugin_util.get_plsql_expression_result(p_plsql_expression => l_plsql_expr);
    WHEN 'SQL_STATEMENT'
    THEN
       l_column_value_list := apex_plugin_util.get_data (
            p_sql_statement    => l_sql_query,
            p_min_columns      => 1,
            p_max_columns      => 1,
            p_component_name   => 'P9999_USERNAME',
            p_max_rows         => 1 );

      FOR i IN 1 .. l_column_value_list(1).count
      LOOP
        l_db_result := l_column_value_list(1)(i);
      END LOOP;
    END CASE;


    apex_json.open_object; 
    apex_json.write('value', l_db_result );
    apex_json.close_object;

    RETURN l_result; 
    
  END ajax;

END pkg_com_pretius_apex_badge;
/
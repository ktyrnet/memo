<?php
/**
 * [Description EsaModel]
 */
class EsaModel {
    /**
     * コンストラクタ
     */
    public function __construct()
    {
        require_once LIB_DIR . 'idiorm.php';
        ORM::configure('mysql:host='.DB_HOST.';dbname='.DB_NAME);
        ORM::configure('username', DB_USER);
        ORM::configure('password', DB_PASSWORD);
        ORM::configure('driver_options', [
            PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8',
        ]);
    }
    /**
     * [Description for get_columns]
     *
     * @param string $table_name
     * @param array $ignore_clumns
     * 
     * @return [array]
     * 
     */
    public function get_columns($table_name,$ignore_clumns = null)
    {
        $result = ORM::for_table('information_schema.columns')
        ->select('column_name')
        ->where('table_name',$table_name ) 
        ->order_by_expr('ordinal_position')
        ->find_array();
        $columns = array_column($result,'column_name');
        if(empty($columns)){
            $result = ORM::raw_execute("show columns from {$table_name}");
            $statement = ORM::get_last_statement();
            $rows = [];
            $columns = [];
            while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
                $columns[] = $row['Field'];
            }
        }
        if(!empty($ignore_clumns)){
            $columns = array_diff($columns,$ignore_clumns);
        }
        return $columns;
    }
    /**
     * [Description for get_posts]
     *
     * @param int $page
     * @param int $per_page
     * 
     * @return [array]
     * 
     */
    public function get_posts($page = 1,$per_page = 20)
    {
        $columns = $this->get_columns('posts');
        $result = ORM::for_table('posts')
        ->select($columns)
        ->limit($per_page)
        ->offset( ($page - 1) * $per_page )
        ->order_by_asc('id')
        ->find_array();
        return $result;
    }
    /**
     * [Description for get_post_by_id]
     *
     * @param int $id
     * 
     * @return [array]
     * 
     */
    public function get_post_by_id($id)
    {
        $columns = $this->get_columns('posts');
        $result = ORM::for_table('posts')
        ->select($columns)
        ->where_equal('id',$id)
        ->find_array();
        return empty($result) ? [] : $result[0];
    }
    /**
     * [Description for get_posts_count]
     *
     * @return [int]
     * 
     */
    public function get_posts_count()
    {
        $result = ORM::for_table('posts')->count();
        return $result;
    }
    /**
     * [Description for get_post_by_number]
     *
     * @param int $number
     * 
     * @return [array]
     * 
     */
    public function get_post_by_number($number)
    {
        $columns = $this->get_columns('posts');
        $result = ORM::for_table('posts')
        ->select($columns)
        ->where_equal('number',$number)
        ->find_array();
        return empty($result) ? [] : $result[0];
    }
    /**
     * [Description for get_posts_by_numbers]
     *
     * @param array $numbers
     * 
     * @return [array]
     * 
     */
    public function get_posts_by_numbers($numbers)
    {
        $result = ORM::for_table('posts')
        ->select(['id','number'])
        ->where_in('number',$numbers)
        ->order_by_asc('id')
        ->find_array();
        return $result;
    }
    /**
     * [Description for get_teams]
     *
     * @return [array]
     * 
     */
    public function get_teams()
    {
        try{
            $sql = "SELECT * FROM teams ORDER BY id ASC";
            $records = ORM::for_table('shops')->raw_query($sql)->find_array();
        }catch (PDOException $e){
            return null;
        }
        return $records;
    }
    /**
     * [Description for save_post]
     *
     * @param array $post
     * 
     * @return [bool]
     * 
     */
    public function save_post($post)
    {
        $columns = $this->get_columns('posts');
        $record = ORM::for_table('posts')
        ->select($columns)
        ->where_equal('number',$post['number'])
        ->find_one();
        if(empty($record)){
            $record = ORM::for_table('posts')->create();
        }
        $record->number = $post['number'];
        $record->name = $post['name'];
        $record->full_name = $post['full_name'];
        $record->body_html = $post['body_html'];
        $record->body_html_origin = $post['body_html'];
        $record->created_at = $post['created_at'];
        $record->message = $post['message'];
        $record->url = $post['url'];
        $record->updated_at = $post['updated_at'];
        $record->tags = is_array($post['tags']) ? json_encode($post['tags'],JSON_UNESCAPED_UNICODE) : '';
        $record->category = $post['category'];
        $record->sharing_urls = is_array($post['sharing_urls']) ? json_encode($post['sharing_urls'],JSON_UNESCAPED_UNICODE) : '';
        return $record->save();
    }
    /**
     * [Description for update_teams]
     *
     * @param array $teams
     * 
     * @return [bool]
     * 
     */
    public function update_teams($teams)
    {
        $columns = $this->get_columns('teams',['id']);
        $sql = [];
        $sql[]= 'INSERT INTO `teams`(`' . implode('`,`',$columns) . '`) VALUES';
        $values = [];
        foreach ($teams as $i => $team) {
            $tmp = [];
            foreach ($columns as $i => $column) {
                if(array_key_exists($column,$team)){
                    $tmp[] = "'" . $team[$column] . "'";
                }
            }
            $values[] = '(' . implode(',',$tmp) . ')';
        }
        $sql[] = implode(',',$values);
        $fullsql = implode(' ',$sql);
        try{
            $result = ORM::for_table('teams')->raw_execute($fullsql);
        }catch (PDOException $e){
            return false;
        }
        return $result;
    }
}
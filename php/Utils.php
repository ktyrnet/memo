<?php
/**
 * [Description Utils]
 */
class Utils {
    /**
     * コンストラクタ
     */
    public function __construct()
    {
    }
    /**
     * [Description for display]
     *
     * @param string $file
     * @param array $data
     * @param bool $only_body
     * 
     * @return [type]
     * 
     */
    public static function display($file, $data = null, $only_body = false)
    {
        if(!empty($data)){
            foreach ($data as $key => $val) {
                ${$key} = $val;
            }
		}
        if($only_body === false){
		    include(VIEW_DIR . 'header.php');
        }
		include(VIEW_DIR . basename($file).'.php');
        if($only_body === false){
		    include(VIEW_DIR . 'footer.php');
        }
	}
    /**
     * [Description for echo_json]
     *
     * @param array $data
     * 
     */
    public static function echo_json($data)
    {
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode($data,JSON_UNESCAPED_UNICODE);
    }
}
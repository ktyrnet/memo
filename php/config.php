<?php
define('LIB_DIR',__DIR__ . DIRECTORY_SEPARATOR);
define('VIEW_DIR',__DIR__ . DIRECTORY_SEPARATOR . 'view' . DIRECTORY_SEPARATOR);
define('IMAGE_DIR',dirname(__DIR__) . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR);
define('TEAMS_DIR',dirname(__DIR__) . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'teams' . DIRECTORY_SEPARATOR);
define('IMAGE_BASE_URL','/images/');
define('TEAMS_BASE_URL','/images/teams/');
define('ESA_TOKEN','xxxxxxx');
define('ESA_API_BASE_URL','https://api.esa.io/v1/');
define('PER_PAGE', 100);
if(strpos($_SERVER['HTTP_HOST'],'localhost') !== false){
	define('IS_LOCAL', true);
}else{
	define('IS_LOCAL', false);
}
if(IS_LOCAL){
define('DB_NAME', 'xxxxx');
define('DB_USER', 'xxxxx');
define('DB_PASSWORD', 'xxxxx');
define('DB_HOST', 'localhost');
}else{
define('DB_NAME', 'xxxxx');
define('DB_USER', 'xxxxx');
define('DB_PASSWORD', 'xxxxxx');
define('DB_HOST', 'xxxxx');
}
require LIB_DIR . 'EsaModel.php';
require LIB_DIR . 'functions.php';
require LIB_DIR . 'MainController.php';

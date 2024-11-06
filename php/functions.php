<?php
/**
 * [Description for _h]
 *
 * @param string $str
 * 
 */
function _h($str)
{
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}
/**
 * [Description for echo_html]
 *
 * @param string $str
 * 
 */
function echo_html($str)
{
    if(is_string($str)){
        echo _h($str);
    }else{
        echo json_encode($str,JSON_UNESCAPED_UNICODE);
    }
}
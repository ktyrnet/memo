<?php
/**
 * [Description MainController]
 */
class MainController {
    /**
     * [Description for $esa]
     *
     * @var [type]
     */
    public $esa;
    /**
     * コンストラクタ
     */
    public function __construct()
    {
        $this->esa = new EsaModel();
    }
    /**
     * 初期化
     */
    public function init()
    {
    }
}
/**
 * バリデーション
 * 依存関係を断つためにUtilsは使わない
 * 
 * @class ValidationManager
 * @typedef {ValidationManager}
 */
class ValidationManager {
    /**
     * Creates an instance of ValidationManager.
     *
     * @constructor
     */
    constructor() {
        this.param = {
            submit         : true,/* true:formのsubmit時にチェックする */
            mode           : 0,/* チェックするタイミング 0:常に 1:エラー時のみ 2:送信押下後常に */
            scroll         : true,
            validated      : false,/* 内部使用 */
            oneByOne       : false,/* true:複数のチェック項目をもつ項目のチェックでエラーが出た時点でそれ以降のチェックを中止する */
            checkons       : [],
            scrollTarget   : window,
            parentSelector : ''
        };
        this.form = null;
        this.errorConditions = [];
        this.am = new AnimateManager();
    }
    /* getter */
    get ERROR_CLASS(){
        return 'error';
    }
    get HIDDEN_CLASS(){
        return 'hide';
    }
    /**
     * querySelectorAll
     *
     * @param {String} selector
     * @param {HTMLElement} elm
     * @returns {NodeList}
     */
    qsall(selector,elm){
        if(!elm)elm = this.form ? this.form : document;
        return elm.querySelectorAll(selector);
    }
    /**
     * querySelector
     *
     * @param {String} selector
     * @param {HTMLElement} elm
     * @returns {HTMLElement}
     */
    qs(selector,elm){
        if(!elm)elm = this.form ? this.form : document;
        return elm.querySelector(selector);
    }
    /**
     * タグがtagNameと一致するか判定
     *
     * @param {HTMLElement} elm
     * @param {*} tagName
     * @param {*} type
     * @returns {boolean}
     */
    tagNameIs(elm,tagName,type){
        let result = false;
        if(Array.isArray(tagName)){
            result = tagName.includes(elm.tagName.toLowerCase());
        }else{
            result = elm.tagName.toLowerCase() === tagName.toLowerCase();
        }
        if(result && type){
            if(Array.isArray(type)){
                result = type.includes(elm.type.toLowerCase());
            }else{
                result = elm.type.toLocaleLowerCase() === type.toLocaleLowerCase();
            }
        }
        return result;
    }
    /**
     * 初期化
     *
     * @param {HTMLElement} form
     * @param {Object} param
     */
    init(form,param) {
        if(!form)return;
        this.form = form;
        if(param){
            this.param = {...this.param,...param};
        }
        if(this.param.submit){
            form.addEventListener('submit',(e)=>{
                this.onFormSubmit(e);
            });
        }
        let i,nn,elements = this.qsall('[data-vid]',form);
        for (i = 0; i < elements.length; i++) {
            nn = elements[i].tagName.toLowerCase();
            if(this.tagNameIs(elements[i],'select') || this.tagNameIs(elements[i],'input',['checkbox','radio'])){
                elements[i].addEventListener('change',(e)=>{
                    this.onFormChange(e);
                });
            }
            elements[i].addEventListener('blur',(e)=>{
                this.onFormBlur(e);
            });
        }
    }
    /**
     * 指定要素の指定イベントでバリデーションを実施する
     *
     * @param {HTMLElement} elm
     * @param {String} eventName
     * @param {Function} func
     */
    addEventListener(elm,eventName,func){
        if(typeof elm === 'string'){
            elm = document.querySelectorAll(elm);
        }
        if(NodeList.prototype.isPrototypeOf(elm)){
            elm.forEach((_elm,i)=>{
                this.addEventListener(_elm,eventName,func);
            });
        }else{
            elm.addEventListener(eventName,(e)=>{
                const result = this.validateByForm(this.form);
                if(!result){
                    this.cancelEvent(e);
                    this.scrollToErrorElement();
                }
                if(func){
                    func(result);
                }
            });
        }
    }
    /**
     * イベントキャンセル
     *
     * @param {Event} e
     */
    cancelEvent (e) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    /**
     * submit時の処理
     *
     * @param {Event} e
     */
    onFormSubmit(e) {
        if(!this.validateByForm(e.target)){
            this.cancelEvent(e);
        }
        this.updateErrorHasMultiConditions();
        this.scrollToErrorElement();
    }
    /**
     * change時の処理
     *
     * @param {Event} e
     */
    onFormChange(e) {
        if(this.getShouldIValidate(e.target)){
            this.validateByElement(e.target);
            this.executeCheckons();
            this.updateErrorHasMultiConditions();
        }
    }
    /**
     * blur時の処理
     *
     * @param {Event} e
     */
    onFormBlur(e) {
        if(e.target.dataset.v && e.target.dataset.v.includes('full2half')){
            e.target.value = Validator.full2half(e.target.value);
        }
        if(this.getShouldIValidate(e.target)){
            this.validateByElement(e.target);
            this.executeCheckons();
            this.updateErrorHasMultiConditions();
        }
    }
    /**
     * バリデーション実施要否判定
     *
     * @param {HTMLElement} target
     * @returns {boolean}
     */
    getShouldIValidate(target){
        let execute = true;
        if(this.param.mode === 1){
            execute = false;
            const elm = this.qs(`[data-vid="${target.dataset.ves}"]`,this.form);
            if(elm && elm.classList.contains(this.ERROR_CLASS)){
                execute = true;
            }
        }else if(this.param.mode === 2){
            execute = this.param.validated;
        }
        return execute;
    }
    /**
     * エラー更新処理
     */
    updateErrorHasMultiConditions(){
        this._updateErrorHasMultiConditions('ve',false,this.HIDDEN_CLASS);
        this._updateErrorHasMultiConditions('ves',true,this.ERROR_CLASS);
    }
    /**
     * エラー更新コア処理
     *
     * @param {String} dataName
     * @param {Boolean} add
     * @param {String} className
     */
    _updateErrorHasMultiConditions(dataName,add,className){
        let i,j;
        let conditions,hasError,errors;
        errors = this.qsall(`[data-${dataName}*=" "]`,this.form);
        for (i = 0; i < errors.length; i++) {
            hasError = false;
            conditions = errors[i].dataset[dataName].split(" ");
            for (j = 0; j < conditions.length; j++) {
                hasError = this.errorConditions.includes(conditions[j]);
                if(hasError){
                    break;
                }
            }
            if(add){
                if(hasError) {
                    errors[i].classList.add(className);
                }else {
                    errors[i].classList.remove(className);
                }
            }else{
                if(hasError) {
                    errors[i].classList.remove(className);
                }else {
                    errors[i].classList.add(className);
                }
            }
        }
    }
    /**
     * 全エラーテキスト非表示、全エラークラス削除
     *
     * @param {HTMLElement} form
     */
    resetForm(form){
        let i,j,k;
        let vid,conditions,condition,errors;
        const elements = this.qsall('[data-vid]',form);
        for (i = 0; i < elements.length; i++) {
            vid = elements[i].dataset.vid.toString();
            conditions = elements[i].dataset.v.split(' ');
            for(j = 0; j < conditions.length;j++){
                condition = conditions[j].split('-').shift();
                errors = this.qsall(`[data-ve~="${vid}"],[data-ve~="${vid}-${condition}"]`,form);
                for (k = 0; k < errors.length; k++) {
                    errors[k].classList.add(this.HIDDEN_CLASS);
                }
                errors = this.qsall(`[data-ves~="${vid}"],[data-ves~="${vid}-${condition}"]`,form);
                for (k = 0; k < errors.length; k++) {
                    errors[k].classList.remove(this.ERROR_CLASS);
                }
            }
        }
    }
    /**
     * バリデーション処理
     *
     * @param {HTMLElement} form
     * @returns {boolean}
     */
    validateByForm(form,scroll) {
        let i;
        let elements = this.qsall('[data-vid]',form);
        let result = true;
        for (i = 0; i < elements.length; i++) {
            if(!this.validateByElement(elements[i],true)){
                result = false;
            }
        }
        this.executeCheckons();
        this.param.validated = true;
        if(scroll){
            this.scrollToErrorElement();
        }
        return result;
    }
    /**
     * バリデーション処理
     *
     * @param {HTMLElement} elm
     * @param {Boolean} ignoreGroup
     * @returns {boolean}
     */
    validateByElement (elm,ignoreGroup) {
        let i,j;
        let conditions,param,condition,result,errors;
        let vid = elm.dataset.vid;
        const groupConditions = ['past','validymd'];
        let groupVID = [];
        let names = [];
        if(vid && elm.dataset.v && !elm.disabled) {
            vid = vid.toString();
            conditions = elm.dataset.v.split(' ');
            for(i = 0; i < conditions.length;i++){
                param = conditions[i].split('-');
                condition = param.shift();
                if(/^checkon.+$/.test(condition)){
                    this.param.checkons.push([elm,conditions[i]]);
                    continue;
                }
                if(condition != 'required' && elm.value == ''){
                    continue;
                }
                if(condition === 'full2half'){
                    continue;
                }
                if(!ignoreGroup && groupConditions.includes(condition)){
                    groupVID = [...groupVID,...param];
                }
                result = Validator[condition](elm,param,this.form);
                if(!result){
                    names.push(condition);
                    if(condition === 'required' || this.param.oneByOne)break;
                }
            }
            /* エラー表示更新 */
            this._clearErrorByVID(vid);
            if(names.length) {
                this.errorConditions.push(vid);
                for (i = 0; i < names.length; i++) {
                    this.errorConditions.push(`${vid}-${names[i]}`);
                    errors = this.qsall(`[data-ve~="${vid}"],[data-ve~="${vid}-${names[i]}"]`,this.form);
                    for (j = 0; j < errors.length; j++) {
                        errors[j].classList.remove(this.HIDDEN_CLASS);
                    }
                    errors = this.qsall(`[data-ves~="${vid}"],[data-ves~="${vid}-${names[i]}"]`,this.form);
                    for (j = 0; j < errors.length; j++) {
                        errors[j].classList.add(this.ERROR_CLASS);
                    }
                }
            }
            /* グループ処理 */
            if(!ignoreGroup && groupVID.length){
                let target = this.form ? this.form : document;
                groupVID = [...new Set(groupVID)];
                for(i=0;i<groupVID.length;i++){
                    if(vid === groupVID[i]){
                        continue;
                    }
                    console.log(groupVID[i]);
                    const targetElm = target.querySelector(`[data-vid="${groupVID[i]}"]`);
                    if(targetElm){
                        this.validateByElement(targetElm,true);
                    }
                }
            }
        }
        return names.length ? false : true;
    }
    /**
     * past,validymdなど複数要素で判定する条件を持っているか
     *
     * @param {HTMLElement} elm
     * @returns {boolean}
     */
    hasGroup(elm){
        let i;
        let conditions,param,condition;
        let vid = elm.dataset.vid;
        if(vid && elm.dataset.v && !elm.disabled) {
            vid = vid.toString();
            conditions = elm.dataset.v.split(' ');
            for(i = 0; i < conditions.length;i++){
                param = conditions[i].split('-');
                condition = param.shift();
                if(['past','validymd'].includes(condition) && 2 < param.length){
                    return true;
                }
            }
        }
        return false;
    }
    executeGroup(elm){
        const target = this.form ? this.form : document;
        const yearElm = target.querySelector(`[data-vid="${param[0]}"]`);
        const monthElm = target.querySelector(`[data-vid="${param[1]}"]`);
        const dayElm = target.querySelector(`[data-vid="${param[2]}"]`);
    }
    /**
     * checkon系の処理
     */
    executeCheckons(){
        this.param.checkons.forEach((checkon,i)=>{
            let param = checkon[1].split('-');
            let condition = param.shift().replace('checkon','');
            /* checkonempty */
            if(condition === 'empty'){
                if(checkon[0].value == ''){
                    const elm = this.form.querySelector(`[data-vid="${param[0]}"]`);
                    if(elm && this.getShouldIValidate(elm)){
                        this.validateByElement(elm);
                        this.updateErrorHasMultiConditions();
                    }
                }
            }
        });
        this.param.checkons = [];
    }
    /**
     * エラー用クラス更新処理
     *
     * @param {*} vid
     */
    _clearErrorByVID(vid){
        let i;
        let errors;
        const reg = new RegExp(`^${vid}\-.+$`);
        this.errorConditions = this.errorConditions.filter(item => !(item === vid || reg.test(item)) );
        errors = this.qsall(`[data-ve~="${vid}"],[data-ve^="${vid}-"],[data-ve*=" ${vid}-"]`,this.form);
        for (i = 0; i < errors.length; i++) {
            errors[i].classList.add(this.HIDDEN_CLASS);
        }
        errors = this.qsall(`[data-ves~="${vid}"],[data-ves^="${vid}-"],[data-ves*=" ${vid}-"]`,this.form);
        for (i = 0; i < errors.length; i++) {
            errors[i].classList.remove(this.ERROR_CLASS);
        }
    }
    /**
     * スクロール処理
     */
    scrollToErrorElement(){
        if(!this.errorConditions.length || !this.param.scroll){
            return;
        }
        const header = this.param.scrollTarget == window ? document.querySelector('header') : null;
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        let i,elm,tmp,y = 0;
        for (i = 0; i < this.errorConditions.length; i++) {
            if(/^[^\-]+$/.test(this.errorConditions[i])){
                elm = this.qs(`[data-vid="${this.errorConditions[i]}"]`,this.form);
                if(elm && elm.parentNode){
                    if(this.param.scrollTarget == window){
                        tmp = elm.parentNode.getBoundingClientRect().top + this.param.scrollTarget.scrollY - headerHeight;
                    }else{
                        const parentElm = this.param.parentSelector ? elm.closest(this.param.parentSelector) : elm.parentNode;
                        const parentRect = parentElm.getBoundingClientRect();
                        tmp = this.param.scrollTarget.scrollTop + parentRect.top - parentRect.height;
                    }
                    if(y <= 0 || tmp < y){
                        y = tmp;
                    }
                }
            }
        }
        if(0 < y) {
            this.am.scrollTo(y,500,this.param.scrollTarget);
        }
    }
}
/**
 * 各種バリデーション処理を司る
 *
 * @class Validator
 * @typedef {Validator}
 */
class Validator{
    /**
     * Creates an instance of Validator.
     *
     * @constructor
     */
    constructor() {}
    /**
     * タグがtagNameと一致するか判定
     *
     * @static
     * @param {HTMLElement} elm
     * @param {*} tagName
     * @param {*} type
     * @returns {boolean}
     */
    static tagNameIs(elm,tagName,type){
        let result = false;
        if(Array.isArray(tagName)){
            result = tagName.includes(elm.tagName.toLowerCase());
        }else{
            result = elm.tagName.toLowerCase() === tagName.toLowerCase();
        }
        if(result && type){
            if(Array.isArray(type)){
                result = type.includes(elm.type.toLowerCase());
            }else{
                result = elm.type.toLocaleLowerCase() === type.toLocaleLowerCase();
            }
        }
        return result;
    }
    /**
     * 全角 -> 半角
     *
     * @static
     * @param {String} str
     * @returns {String}
     */
    static full2half(str) {
        return str.replace(/[！-～]/g, function(s){
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
    }
    /**
     * 必須
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static required(elm,param,target) {
        if(!target)target = document;
        let values,elms,value;
        if(param && Array.isArray(param) && 1 < param.length){
            if(param[0] === 'notempty'){
                values = [];
                elms = target.querySelectorAll(`[data-vid="${param[1]}"]`);
                elms.forEach((elm,i)=>{
                    values.push(elm.value);
                });
                value = values.join('').trim();
                if(value == ''){
                    return true;
                }
            }
        }
        if(Validator.tagNameIs(elm,'input',['checkbox','radio'])){
            elms = target.querySelectorAll(`[name="${elm.name}"]:checked`);
            return elms.length && elms[0].value;
        }
        return !( elm.value === undefined || elm.value === null || ( typeof elm.value === "string" && elm.value.trim() === "") );
    }
    /**
     * 必須(trimせずに判定)
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static required_notrim(elm,param,target) {
        if(!target)target = document;
        let values,elms,value;
        if(param && Array.isArray(param) && 1 < param.length){
            if(param[0] === 'notempty'){
                values = [];
                elms = target.querySelectorAll(`[data-vid="${param[1]}"]`);
                elms.forEach((elm,i)=>{
                    values.push(elm.value);
                });
                value = values.join('');
                if(value == ''){
                    return true;
                }
            }
        }
        if(Validator.tagNameIs(elm,'input',['checkbox','radio'])){
            elms = target.querySelectorAll(`[name="${elm.name}"]:checked`);
            return elms.length && elms[0].value;
        }
        return !( elm.value === undefined || elm.value === null || ( typeof elm.value === "string" && elm.value.trim() === "") );
    }
    /**
     * メールアドレス
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static email(elm,param,target) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elm.value);
    }
    /**
     * メールアドレスRFC
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static email_rfc(elm,param,target) {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(elm.value);
    }
    /**
     * 2項目一致
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static equal(elm,param,target){
        if(param.length < 1){
            return false;
        }
        if(!target)target = document;
        const elm2 = target.querySelector(`[data-vid="${param[0]}"]`);
        return elm2 && elm.value == elm2.value;
    }
    /**
     * 半角
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static hankaku(elm,param,target){
        return /^[\x20-\x7e]*$/.test(elm.value);
    }
    /**
     * 半角(スペース除く)
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static hankaku_nospace(elm,param,target){
        return /^[\x21-\x7e]*$/.test(elm.value);
    }
    /**
     * 半角数字
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static int(elm,param,target){
        return /^\d+$/.test(elm.value);
    }
    /**
     * 半角数字マイナス含む
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static int_m(elm,param,target){
        return /^\-?\d+$/.test(elm.value);
    }
    /**
     * 文字数
     * len-1-10 1～10
     * len-4 4～
     * len--10 ～10
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static len(elm,param,target) {
        if(0 < param.length && typeof param[0] === "string" && /^\d+$/.test(param[0]))param[0] = Number(param[0]);
        if(1 < param.length && typeof param[1] === "string" && /^\d+$/.test(param[1]))param[1] = Number(param[1]);
        if(0 < param.length && typeof param[0] === "number" && elm.value.length < param[0])return false;
        if(1 < param.length && typeof param[1] === "number" && param[1] < elm.value.length)return false;
        return true;
    }
    /**
     * 電話番号
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static phone(elm,param,target) {
        return /^[\d\-]{10,13}$/.test(elm.value);
    }
    /**
     * 電話番号(ハイフン無し)
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static phone_nohyphen(elm,param,target) {
        return /^[\d]{10,11}$/.test(elm.value);
    }
    /**
     * 電話番号2
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static phone2(elm,param,target) {
        return /^[\d\-０-９ー]+$/.test(elm.value);
    }
    /**
     * カタカナ
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static kana(elm,param,target){
        return /^[ァ-ヶー　]+$/.test(elm.value);
    }
    /**
     * カタカナ+半角スペース
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static kana2(elm,param,target){
        return /^[ァ-ヶー　 ]+$/.test(elm.value);
    }
    /**
     * 半角カナ
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static kana_half(elm,param,target){
        return /^[\uFF61-\uFF9F]+$/.test(elm.value);
    }
    /**
     * ひらがな
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static hira(elm,param,target){
        return /^\p{sc=Hiragana}+$/u.test(elm.value);
    }
    /**
     * 全角記号を含む
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static includes_zen_mark(elm,param,target){
        /*全角記号 /[\u3000-\u303F\uff00-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff5e]/ */
        /*
        30fb : ・
        ff06 : ＆
        ff08 : （
        ff09 : ）
        を除いた全角記号
        */
        return /[\u3000-\u3040\uff00-\uff05\uff07\uff0a-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff5e]/.test(elm.value);
    }
    /**
     * 下記以外の全角記号を含まない
     * 30fb : ・
     * ff06 : ＆
     * ff08 : （
     * ff09 : ）
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static excludes_zen_mark(elm,param,target){
        return !Validator.includes_zen_mark(elm,param);
    }
    /**
     * 全角スペース、半角スペースを含む
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static includes_zen_half_space(elm,param,target){
        return /[ 　]/.test(elm.value);
    }
    /**
     * 全角スペース、半角スペースを含まない
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static excludes_zen_half_space(elm,param,target){
        return !Validator.includes_zen_half_space(elm,param);
    }
    /**
     * 文字列内の漢字が常用漢字のみ
     * 常用漢字は2136文字
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static joyokanji(elm,param,target){
        const matches = elm.value.match(/(\p{scx=Han}+)/ug);
        if(!matches || matches.length < 1){
            return true;
        }
        const str = matches.join('');
        return /^[亜哀挨愛曖悪握圧扱宛嵐安案暗以衣位囲医依委威為畏胃尉異移萎偉椅彙意違維慰遺緯域育一壱逸茨芋引印因咽姻員院淫陰飲隠韻右宇羽雨唄鬱畝浦運雲永泳英映栄営詠影鋭衛易疫益液駅悦越謁閲円延沿炎怨宴媛援園煙猿遠鉛塩演縁艶汚王凹央応往押旺欧殴桜翁奥横岡屋億憶臆虞乙俺卸音恩温穏下化火加可仮何花佳価果河苛科架夏家荷華菓貨渦過嫁暇禍靴寡歌箇稼課蚊牙瓦我画芽賀雅餓介回灰会快戒改怪拐悔海界皆械絵開階塊楷解潰壊懐諧貝外劾害崖涯街慨蓋該概骸垣柿各角拡革格核殻郭覚較隔閣確獲嚇穫学岳楽額顎掛潟括活喝渇割葛滑褐轄且株釜鎌刈干刊甘汗缶完肝官冠巻看陥乾勘患貫寒喚堪換敢棺款間閑勧寛幹感漢慣管関歓監緩憾還館環簡観韓艦鑑丸含岸岩玩眼頑顔願企伎危机気岐希忌汽奇祈季紀軌既記起飢鬼帰基寄規亀喜幾揮期棋貴棄毀旗器畿輝機騎技宜偽欺義疑儀戯擬犠議菊吉喫詰却客脚逆虐九久及弓丘旧休吸朽臼求究泣急級糾宮救球給嗅窮牛去巨居拒拠挙虚許距魚御漁凶共叫狂京享供協況峡挟狭恐恭胸脅強教郷境橋矯鏡競響驚仰暁業凝曲局極玉巾斤均近金菌勤琴筋僅禁緊錦謹襟吟銀区句苦駆具惧愚空偶遇隅串屈掘窟熊繰君訓勲薫軍郡群兄刑形系径茎係型契計恵啓掲渓経蛍敬景軽傾携継詣慶憬稽憩警鶏芸迎鯨隙劇撃激桁欠穴血決結傑潔月犬件見券肩建研県倹兼剣拳軒健険圏堅検嫌献絹遣権憲賢謙鍵繭顕験懸元幻玄言弦限原現舷減源厳己戸古呼固股虎孤弧故枯個庫湖雇誇鼓錮顧五互午呉後娯悟碁語誤護口工公勾孔功巧広甲交光向后好江考行坑孝抗攻更効幸拘肯侯厚恒洪皇紅荒郊香候校耕航貢降高康控梗黄喉慌港硬絞項溝鉱構綱酵稿興衡鋼講購乞号合拷剛傲豪克告谷刻国黒穀酷獄骨駒込頃今困昆恨根婚混痕紺魂墾懇左佐沙査砂唆差詐鎖座挫才再災妻采砕宰栽彩採済祭斎細菜最裁債催塞歳載際埼在材剤財罪崎作削昨柵索策酢搾錯咲冊札刷刹拶殺察撮擦雑皿三山参桟蚕惨産傘散算酸賛残斬暫士子支止氏仕史司四市矢旨死糸至伺志私使刺始姉枝祉肢姿思指施師恣紙脂視紫詞歯嗣試詩資飼誌雌摯賜諮示字寺次耳自似児事侍治持時滋慈辞磁餌璽鹿式識軸七叱失室疾執湿嫉漆質実芝写社車舎者射捨赦斜煮遮謝邪蛇尺借酌釈爵若弱寂手主守朱取狩首殊珠酒腫種趣寿受呪授需儒樹収囚州舟秀周宗拾秋臭修袖終羞習週就衆集愁酬醜蹴襲十汁充住柔重従渋銃獣縦叔祝宿淑粛縮塾熟出述術俊春瞬旬巡盾准殉純循順準潤遵処初所書庶暑署緒諸女如助序叙徐除小升少召匠床抄肖尚招承昇松沼昭宵将消症祥称笑唱商渉章紹訟勝掌晶焼焦硝粧詔証象傷奨照詳彰障憧衝賞償礁鐘上丈冗条状乗城浄剰常情場畳蒸縄壌嬢錠譲醸色拭食植殖飾触嘱織職辱尻心申伸臣芯身辛侵信津神唇娠振浸真針深紳進森診寝慎新審震薪親人刃仁尽迅甚陣尋腎須図水吹垂炊帥粋衰推酔遂睡穂随髄枢崇数据杉裾寸瀬是井世正生成西声制姓征性青斉政星牲省凄逝清盛婿晴勢聖誠精製誓静請整醒税夕斥石赤昔析席脊隻惜戚責跡積績籍切折拙窃接設雪摂節説舌絶千川仙占先宣専泉浅洗染扇栓旋船戦煎羨腺詮践箋銭潜線遷選薦繊鮮全前善然禅漸膳繕狙阻祖租素措粗組疎訴塑遡礎双壮早争走奏相荘草送倉捜挿桑巣掃曹曽爽窓創喪痩葬装僧想層総遭槽踪操燥霜騒藻造像増憎蔵贈臓即束足促則息捉速側測俗族属賊続卒率存村孫尊損遜他多汰打妥唾堕惰駄太対体耐待怠胎退帯泰堆袋逮替貸隊滞態戴大代台第題滝宅択沢卓拓託濯諾濁但達脱奪棚誰丹旦担単炭胆探淡短嘆端綻誕鍛団男段断弾暖談壇地池知値恥致遅痴稚置緻竹畜逐蓄築秩窒茶着嫡中仲虫沖宙忠抽注昼柱衷酎鋳駐著貯丁弔庁兆町長挑帳張彫眺釣頂鳥朝貼超腸跳徴嘲潮澄調聴懲直勅捗沈珍朕陳賃鎮追椎墜通痛塚漬坪爪鶴低呈廷弟定底抵邸亭貞帝訂庭逓停偵堤提程艇締諦泥的笛摘滴適敵溺迭哲鉄徹撤天典店点展添転填田伝殿電斗吐妬徒途都渡塗賭土奴努度怒刀冬灯当投豆東到逃倒凍唐島桃討透党悼盗陶塔搭棟湯痘登答等筒統稲踏糖頭謄藤闘騰同洞胴動堂童道働銅導瞳峠匿特得督徳篤毒独読栃凸突届屯豚頓貪鈍曇丼那奈内梨謎鍋南軟難二尼弐匂肉虹日入乳尿任妊忍認寧熱年念捻粘燃悩納能脳農濃把波派破覇馬婆罵拝杯背肺俳配排敗廃輩売倍梅培陪媒買賠白伯拍泊迫剥舶博薄麦漠縛爆箱箸畑肌八鉢発髪伐抜罰閥反半氾犯帆汎伴判坂阪板版班畔般販斑飯搬煩頒範繁藩晩番蛮盤比皮妃否批彼披肥非卑飛疲秘被悲扉費碑罷避尾眉美備微鼻膝肘匹必泌筆姫百氷表俵票評漂標苗秒病描猫品浜貧賓頻敏瓶不夫父付布扶府怖阜附訃負赴浮婦符富普腐敷膚賦譜侮武部舞封風伏服副幅復福腹複覆払沸仏物粉紛雰噴墳憤奮分文聞丙平兵併並柄陛閉塀幣弊蔽餅米壁璧癖別蔑片辺返変偏遍編弁便勉歩保哺捕補舗母募墓慕暮簿方包芳邦奉宝抱放法泡胞俸倣峰砲崩訪報蜂豊飽褒縫亡乏忙坊妨忘防房肪某冒剖紡望傍帽棒貿貌暴膨謀頬北木朴牧睦僕墨撲没勃堀本奔翻凡盆麻摩磨魔毎妹枚昧埋幕膜枕又末抹万満慢漫未味魅岬密蜜脈妙民眠矛務無夢霧娘名命明迷冥盟銘鳴滅免面綿麺茂模毛妄盲耗猛網目黙門紋問冶夜野弥厄役約訳薬躍闇由油喩愉諭輸癒唯友有勇幽悠郵湧猶裕遊雄誘憂融優与予余誉預幼用羊妖洋要容庸揚揺葉陽溶腰様瘍踊窯養擁謡曜抑沃浴欲翌翼拉裸羅来雷頼絡落酪辣乱卵覧濫藍欄吏利里理痢裏履璃離陸立律慄略柳流留竜粒隆硫侶旅虜慮了両良料涼猟陵量僚領寮療瞭糧力緑林厘倫輪隣臨瑠涙累塁類令礼冷励戻例鈴零霊隷齢麗暦歴列劣烈裂恋連廉練錬呂炉賂路露老労弄郎朗浪廊楼漏籠六録麓論和話賄脇惑枠湾腕]+$/.test(str);
    }
    /**
     * 文字列内の漢字が人名用漢字のみ
     * 人名用漢字は863文字
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static jinmekanji(elm,param,target){
        const matches = elm.value.match(/(\p{scx=Han}+)/ug);
        if(!matches || matches.length < 1){
            return true;
        }
        const str = matches.join('');
        return /^[乃卜叉之巳勺也已允云廿壬丑巴勿匁尤禾叶弘乎仔只疋凧汀戊卯伊夷曳亦瓜亥匡旭圭伍亙亘弛此而汝丞庄汐尖托辻凪牟肋收杏佑迂邑伽芥迄汲灸玖亨劫芹冴吾宏坐孜灼杖辰杜宋佃辿兎沌芭庇甫芙吻牡酉李伶巫芦佛壯吞步每阿苑奄於茄侃函其祁尭欣庚昂杭肴忽昏些竺杵昌帖陀苔坦宕沓杷枇斧朋孟茅沫怜或侑昊茉苺迪穹來亞兒拔卷拂爭卑社狀娃按郁胤胡廻珂迦俄臥恢恰柑竿祇衿頁彦巷哉珊柘柊洲茸穿茜殆祢姪盃柏毘姥柾俣籾耶柚宥祐洛亮玲俐勁奎昴洸洵珈珀拜恆侮勉祈祉突者俠卽倭烏峨桧莞桔笈矩桂倦倖晃浩紘紗晒柴栖朔窄砥紐峻隼恕哨秤晋秦訊屑閃悌啄耽挺釘砧荻套桐莫畠挽豹娩圃峯哩栗浬凌狼晟晏栞莉赳氣乘凉莊祕峽眞晄狹神悔海祐祖祝臭郞俱涉庵惟寅凰晦菅掬袈訣捲牽絃袴梧皐惚砦笹偲梓悉這雀惇淳渚捷梢菖埴逗釧舵雫梯琢捺紬猪淀兜桶祷萄梶畢彪彬菩捧萌萠逢椛掠琉笠梁菱淋埜崚彗毬晨梛脩笙絆羚眸菫逞冨圈國淨條將專帶從徠敍晝陷朗祥敏梅巢晚淚萊渥粥瑛堰淵凱堺筈萱雁稀葵卿喬欽寓腔喰戟喧硯絢犀斯惹萩葺竣閏疏湘甥粟厨棲貰揃惣湊巽湛智筑註喋脹堵董敦琶斐琵葡焚遥裡椋琳禄隈椀惺曾渾琥釉皓翔單堯惠萬惡盜剩搜爲猪都渚琢著視逸黑揭渴焰虛黃葦溢嘩塙鳩禽馴瑚跨幌嵯蓑裟獅蒔馳嵩楢蒐舜遁楯牒稔瑞靖楚蒼詫楕碓椿禎鼎楠煤蒲楓蒙傭楊蓉溜稜煉蓮碗暉椰滉瑶煌詢頌稟碎圓奧傳祿愼搖與裝虜廊勤暑煮碑溫窪斡蔭鳶嘉榎樺魁箕厩膏閤瑳榊爾竪嘗摺裳榛槙賑翠碩銑槍漕綜聡暢肇蔦槌綴嶋頗箔蔓緋輔鳳碧蓬鞄綾漣颯漱綺綸槇榮實奬遙僞齊粹盡寢團壽滯福僧嘆漢禍禎署賓寬綠摑蔣鞍慧蝦駕嬉槻毅誼蕎駈蕨糊撒撰撞諏醇樟蕉鄭噌噂歎蝶樋播幡磐蕃廟撫蕪篇鋒劉諒遼魯凜凛黎熙諄樂劍澁價儉彈樣稻廣賣醉髮墨層憎穀節練增德緖徵瘦緣謂叡燕薗鴨樫窺橘鋸諺醐縞錫輯錆鞘錘錐樽黛醍薙蹄鮎憐蕗橙澪燎蕾燈龍曉勳縣戰燒默衞險靜諸器謁橫賴曆歷錄霞檜徽磯鞠檎藁鴻壕薩燦濡鍬駿曙篠燭擢檀瓢瞥輿螺嶺應濕縱彌禪穗戲檢謠繁薰擊鍊襖鎧蹟穣雛叢儲鵜鞭麿鯉雜櫂燿藝藥藏鎭禮轉壘謹簞蟬醬蟹麒櫛蘇寵鯛禰曝瀕鵬蘭簾櫓獸瀧懷壞類懲贈難瀨禱繡繫顚巌馨纂耀嚴孃騷鰯轟纏飜鷄櫻攝欄蠟饗讃灘驍鑄聽疊穰臟覽響鷗鷲鱒巖顯纖驗鷹鱗麟鷺釀讓廳]+$/.test(str);
    }
    /**
     * 文字列内の漢字が常用漢字又は人名用漢字のみ
     * 常用漢字は2136文字
     * 人名用漢字は863文字
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static joyojinmekanji(elm,param,target){
        const matches = elm.value.match(/(\p{scx=Han}+)/ug);
        if(!matches || matches.length < 1){
            return true;
        }
        const str = matches.join('');
        return /^[亜哀挨愛曖悪握圧扱宛嵐安案暗以衣位囲医依委威為畏胃尉異移萎偉椅彙意違維慰遺緯域育一壱逸茨芋引印因咽姻員院淫陰飲隠韻右宇羽雨唄鬱畝浦運雲永泳英映栄営詠影鋭衛易疫益液駅悦越謁閲円延沿炎怨宴媛援園煙猿遠鉛塩演縁艶汚王凹央応往押旺欧殴桜翁奥横岡屋億憶臆虞乙俺卸音恩温穏下化火加可仮何花佳価果河苛科架夏家荷華菓貨渦過嫁暇禍靴寡歌箇稼課蚊牙瓦我画芽賀雅餓介回灰会快戒改怪拐悔海界皆械絵開階塊楷解潰壊懐諧貝外劾害崖涯街慨蓋該概骸垣柿各角拡革格核殻郭覚較隔閣確獲嚇穫学岳楽額顎掛潟括活喝渇割葛滑褐轄且株釜鎌刈干刊甘汗缶完肝官冠巻看陥乾勘患貫寒喚堪換敢棺款間閑勧寛幹感漢慣管関歓監緩憾還館環簡観韓艦鑑丸含岸岩玩眼頑顔願企伎危机気岐希忌汽奇祈季紀軌既記起飢鬼帰基寄規亀喜幾揮期棋貴棄毀旗器畿輝機騎技宜偽欺義疑儀戯擬犠議菊吉喫詰却客脚逆虐九久及弓丘旧休吸朽臼求究泣急級糾宮救球給嗅窮牛去巨居拒拠挙虚許距魚御漁凶共叫狂京享供協況峡挟狭恐恭胸脅強教郷境橋矯鏡競響驚仰暁業凝曲局極玉巾斤均近金菌勤琴筋僅禁緊錦謹襟吟銀区句苦駆具惧愚空偶遇隅串屈掘窟熊繰君訓勲薫軍郡群兄刑形系径茎係型契計恵啓掲渓経蛍敬景軽傾携継詣慶憬稽憩警鶏芸迎鯨隙劇撃激桁欠穴血決結傑潔月犬件見券肩建研県倹兼剣拳軒健険圏堅検嫌献絹遣権憲賢謙鍵繭顕験懸元幻玄言弦限原現舷減源厳己戸古呼固股虎孤弧故枯個庫湖雇誇鼓錮顧五互午呉後娯悟碁語誤護口工公勾孔功巧広甲交光向后好江考行坑孝抗攻更効幸拘肯侯厚恒洪皇紅荒郊香候校耕航貢降高康控梗黄喉慌港硬絞項溝鉱構綱酵稿興衡鋼講購乞号合拷剛傲豪克告谷刻国黒穀酷獄骨駒込頃今困昆恨根婚混痕紺魂墾懇左佐沙査砂唆差詐鎖座挫才再災妻采砕宰栽彩採済祭斎細菜最裁債催塞歳載際埼在材剤財罪崎作削昨柵索策酢搾錯咲冊札刷刹拶殺察撮擦雑皿三山参桟蚕惨産傘散算酸賛残斬暫士子支止氏仕史司四市矢旨死糸至伺志私使刺始姉枝祉肢姿思指施師恣紙脂視紫詞歯嗣試詩資飼誌雌摯賜諮示字寺次耳自似児事侍治持時滋慈辞磁餌璽鹿式識軸七叱失室疾執湿嫉漆質実芝写社車舎者射捨赦斜煮遮謝邪蛇尺借酌釈爵若弱寂手主守朱取狩首殊珠酒腫種趣寿受呪授需儒樹収囚州舟秀周宗拾秋臭修袖終羞習週就衆集愁酬醜蹴襲十汁充住柔重従渋銃獣縦叔祝宿淑粛縮塾熟出述術俊春瞬旬巡盾准殉純循順準潤遵処初所書庶暑署緒諸女如助序叙徐除小升少召匠床抄肖尚招承昇松沼昭宵将消症祥称笑唱商渉章紹訟勝掌晶焼焦硝粧詔証象傷奨照詳彰障憧衝賞償礁鐘上丈冗条状乗城浄剰常情場畳蒸縄壌嬢錠譲醸色拭食植殖飾触嘱織職辱尻心申伸臣芯身辛侵信津神唇娠振浸真針深紳進森診寝慎新審震薪親人刃仁尽迅甚陣尋腎須図水吹垂炊帥粋衰推酔遂睡穂随髄枢崇数据杉裾寸瀬是井世正生成西声制姓征性青斉政星牲省凄逝清盛婿晴勢聖誠精製誓静請整醒税夕斥石赤昔析席脊隻惜戚責跡積績籍切折拙窃接設雪摂節説舌絶千川仙占先宣専泉浅洗染扇栓旋船戦煎羨腺詮践箋銭潜線遷選薦繊鮮全前善然禅漸膳繕狙阻祖租素措粗組疎訴塑遡礎双壮早争走奏相荘草送倉捜挿桑巣掃曹曽爽窓創喪痩葬装僧想層総遭槽踪操燥霜騒藻造像増憎蔵贈臓即束足促則息捉速側測俗族属賊続卒率存村孫尊損遜他多汰打妥唾堕惰駄太対体耐待怠胎退帯泰堆袋逮替貸隊滞態戴大代台第題滝宅択沢卓拓託濯諾濁但達脱奪棚誰丹旦担単炭胆探淡短嘆端綻誕鍛団男段断弾暖談壇地池知値恥致遅痴稚置緻竹畜逐蓄築秩窒茶着嫡中仲虫沖宙忠抽注昼柱衷酎鋳駐著貯丁弔庁兆町長挑帳張彫眺釣頂鳥朝貼超腸跳徴嘲潮澄調聴懲直勅捗沈珍朕陳賃鎮追椎墜通痛塚漬坪爪鶴低呈廷弟定底抵邸亭貞帝訂庭逓停偵堤提程艇締諦泥的笛摘滴適敵溺迭哲鉄徹撤天典店点展添転填田伝殿電斗吐妬徒途都渡塗賭土奴努度怒刀冬灯当投豆東到逃倒凍唐島桃討透党悼盗陶塔搭棟湯痘登答等筒統稲踏糖頭謄藤闘騰同洞胴動堂童道働銅導瞳峠匿特得督徳篤毒独読栃凸突届屯豚頓貪鈍曇丼那奈内梨謎鍋南軟難二尼弐匂肉虹日入乳尿任妊忍認寧熱年念捻粘燃悩納能脳農濃把波派破覇馬婆罵拝杯背肺俳配排敗廃輩売倍梅培陪媒買賠白伯拍泊迫剥舶博薄麦漠縛爆箱箸畑肌八鉢発髪伐抜罰閥反半氾犯帆汎伴判坂阪板版班畔般販斑飯搬煩頒範繁藩晩番蛮盤比皮妃否批彼披肥非卑飛疲秘被悲扉費碑罷避尾眉美備微鼻膝肘匹必泌筆姫百氷表俵票評漂標苗秒病描猫品浜貧賓頻敏瓶不夫父付布扶府怖阜附訃負赴浮婦符富普腐敷膚賦譜侮武部舞封風伏服副幅復福腹複覆払沸仏物粉紛雰噴墳憤奮分文聞丙平兵併並柄陛閉塀幣弊蔽餅米壁璧癖別蔑片辺返変偏遍編弁便勉歩保哺捕補舗母募墓慕暮簿方包芳邦奉宝抱放法泡胞俸倣峰砲崩訪報蜂豊飽褒縫亡乏忙坊妨忘防房肪某冒剖紡望傍帽棒貿貌暴膨謀頬北木朴牧睦僕墨撲没勃堀本奔翻凡盆麻摩磨魔毎妹枚昧埋幕膜枕又末抹万満慢漫未味魅岬密蜜脈妙民眠矛務無夢霧娘名命明迷冥盟銘鳴滅免面綿麺茂模毛妄盲耗猛網目黙門紋問冶夜野弥厄役約訳薬躍闇由油喩愉諭輸癒唯友有勇幽悠郵湧猶裕遊雄誘憂融優与予余誉預幼用羊妖洋要容庸揚揺葉陽溶腰様瘍踊窯養擁謡曜抑沃浴欲翌翼拉裸羅来雷頼絡落酪辣乱卵覧濫藍欄吏利里理痢裏履璃離陸立律慄略柳流留竜粒隆硫侶旅虜慮了両良料涼猟陵量僚領寮療瞭糧力緑林厘倫輪隣臨瑠涙累塁類令礼冷励戻例鈴零霊隷齢麗暦歴列劣烈裂恋連廉練錬呂炉賂路露老労弄郎朗浪廊楼漏籠六録麓論和話賄脇惑枠湾腕乃卜叉之巳勺也已允云廿壬丑巴勿匁尤禾叶弘乎仔只疋凧汀戊卯伊夷曳亦瓜亥匡旭圭伍亙亘弛此而汝丞庄汐尖托辻凪牟肋收杏佑迂邑伽芥迄汲灸玖亨劫芹冴吾宏坐孜灼杖辰杜宋佃辿兎沌芭庇甫芙吻牡酉李伶巫芦佛壯吞步每阿苑奄於茄侃函其祁尭欣庚昂杭肴忽昏些竺杵昌帖陀苔坦宕沓杷枇斧朋孟茅沫怜或侑昊茉苺迪穹來亞兒拔卷拂爭卑社狀娃按郁胤胡廻珂迦俄臥恢恰柑竿祇衿頁彦巷哉珊柘柊洲茸穿茜殆祢姪盃柏毘姥柾俣籾耶柚宥祐洛亮玲俐勁奎昴洸洵珈珀拜恆侮勉祈祉突者俠卽倭烏峨桧莞桔笈矩桂倦倖晃浩紘紗晒柴栖朔窄砥紐峻隼恕哨秤晋秦訊屑閃悌啄耽挺釘砧荻套桐莫畠挽豹娩圃峯哩栗浬凌狼晟晏栞莉赳氣乘凉莊祕峽眞晄狹神悔海祐祖祝臭郞俱涉庵惟寅凰晦菅掬袈訣捲牽絃袴梧皐惚砦笹偲梓悉這雀惇淳渚捷梢菖埴逗釧舵雫梯琢捺紬猪淀兜桶祷萄梶畢彪彬菩捧萌萠逢椛掠琉笠梁菱淋埜崚彗毬晨梛脩笙絆羚眸菫逞冨圈國淨條將專帶從徠敍晝陷朗祥敏梅巢晚淚萊渥粥瑛堰淵凱堺筈萱雁稀葵卿喬欽寓腔喰戟喧硯絢犀斯惹萩葺竣閏疏湘甥粟厨棲貰揃惣湊巽湛智筑註喋脹堵董敦琶斐琵葡焚遥裡椋琳禄隈椀惺曾渾琥釉皓翔單堯惠萬惡盜剩搜爲猪都渚琢著視逸黑揭渴焰虛黃葦溢嘩塙鳩禽馴瑚跨幌嵯蓑裟獅蒔馳嵩楢蒐舜遁楯牒稔瑞靖楚蒼詫楕碓椿禎鼎楠煤蒲楓蒙傭楊蓉溜稜煉蓮碗暉椰滉瑶煌詢頌稟碎圓奧傳祿愼搖與裝虜廊勤暑煮碑溫窪斡蔭鳶嘉榎樺魁箕厩膏閤瑳榊爾竪嘗摺裳榛槙賑翠碩銑槍漕綜聡暢肇蔦槌綴嶋頗箔蔓緋輔鳳碧蓬鞄綾漣颯漱綺綸槇榮實奬遙僞齊粹盡寢團壽滯福僧嘆漢禍禎署賓寬綠摑蔣鞍慧蝦駕嬉槻毅誼蕎駈蕨糊撒撰撞諏醇樟蕉鄭噌噂歎蝶樋播幡磐蕃廟撫蕪篇鋒劉諒遼魯凜凛黎熙諄樂劍澁價儉彈樣稻廣賣醉髮墨層憎穀節練增德緖徵瘦緣謂叡燕薗鴨樫窺橘鋸諺醐縞錫輯錆鞘錘錐樽黛醍薙蹄鮎憐蕗橙澪燎蕾燈龍曉勳縣戰燒默衞險靜諸器謁橫賴曆歷錄霞檜徽磯鞠檎藁鴻壕薩燦濡鍬駿曙篠燭擢檀瓢瞥輿螺嶺應濕縱彌禪穗戲檢謠繁薰擊鍊襖鎧蹟穣雛叢儲鵜鞭麿鯉雜櫂燿藝藥藏鎭禮轉壘謹簞蟬醬蟹麒櫛蘇寵鯛禰曝瀕鵬蘭簾櫓獸瀧懷壞類懲贈難瀨禱繡繫顚巌馨纂耀嚴孃騷鰯轟纏飜鷄櫻攝欄蠟饗讃灘驍鑄聽疊穰臟覽響鷗鷲鱒巖顯纖驗鷹鱗麟鷺釀讓廳]+$/.test(str);
    }
    /**
     * 全角
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {Boolean}
     */
    static zenkaku(elm,param,target){
        return /^[^\x20-\x7e]*$/.test(elm.value);
    }
    /**
     * チェック
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static checked(elm,param,target){
        return elm.checked;
    }
    /**
     * 年
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static year(elm,param,target){
        if(/^\d{4}$/.test(elm.value)){
            const v = parseInt(elm.value);
            return 1900 <= v;
        }
        return false;
    }
    /**
     * 月
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static month(elm,param,target){
        if(/^\d{1,2}$/.test(elm.value)){
            const v = parseInt(elm.value);
            return 1 <= v && v <= 12;
        }
        return false;
    }
    /**
     * 日
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static day(elm,param,target){
        if(/^\d{1,2}$/.test(elm.value)){
            const v = parseInt(elm.value);
            return 1 <= v && v <= 31;
        }
        return false;
    }
    /**
     * 日付有効性
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static validymd(elm,param,target){
        if(param.length < 3){
            return false;
        }
        if(!target)target = document;
        const yearElm = target.querySelector(`[data-vid="${param[0]}"]`);
        const monthElm = target.querySelector(`[data-vid="${param[1]}"]`);
        const dayElm = target.querySelector(`[data-vid="${param[2]}"]`);
        /* data属性で示す要素が無い */
        if(!yearElm || !monthElm || !dayElm){
            return false;
        }
        /* trimしない値が空の時は入力中のため判定しない */
        if(yearElm.value == "" || monthElm.value == "" || dayElm.value == ""){
            return true;
        }
        if(Validator.year(yearElm) && Validator.month(monthElm) && Validator.day(dayElm)){
            const year = parseInt(yearElm.value);
            const month = parseInt(monthElm.value);
            const day = parseInt(dayElm.value);
            let d = new Date();
            d.setDate(1);
            d.setFullYear(year);
            d.setMonth(month-1);
            d.setDate(day);
            if(d.getFullYear() == year && d.getMonth() == month-1 && d.getDate() == day){
                return true;
            }
        }
        return false;
    }
    /**
     * 日付過去
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static past(elm,param,target){
        if(!Validator.validymd(elm,param,target)){
            return false;
        }
        if(!target)target = document;
        const yearElm = target.querySelector(`[data-vid="${param[0]}"]`);
        const monthElm = target.querySelector(`[data-vid="${param[1]}"]`);
        const dayElm = target.querySelector(`[data-vid="${param[2]}"]`);
        /* trimしない値が空の時は入力中のため判定しない */
        if(yearElm.value == "" || monthElm.value == "" || dayElm.value == ""){
            return true;
        }
        const year = parseInt(yearElm.value);
        const month = parseInt(monthElm.value);
        const day = parseInt(dayElm.value);
        let d = new Date();
        let now = d.getTime() - 1000;
        d.setFullYear(year);
        d.setMonth(month-1);
        d.setDate(day);
        return d.getTime() < now;
    }
    /**
     * password1大文字アルファベット　小文字アルファベット　数字　それぞれ１文字以上必要
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static password1(elm,param,target){
        return Validator.password_1(elm,param) && Validator.password_2(elm,param) && Validator.password_3(elm,param);
    }
    /**
     * 大文字アルファベットを含む
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static password_1(elm,param,target){
        return /[A-Z]/.test(elm.value);
    }
    /**
     * 小文字アルファベットを含む
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static password_2(elm,param,target){
        return /[a-z]/.test(elm.value);
    }
    /**
     * 数字を含む
     *
     * @static
     * @param {HTMLElement} elm
     * @param {Object} param
     * @param {*} target
     * @returns {boolean}
     */
    static password_3(elm,param,target){
        return /[0-9]/.test(elm.value);
    }
}
/**
 * スクロールアニメーションを司る
 *
 * @class AnimateManager
 * @typedef {AnimateManager}
 */
class AnimateManager{
    /**
     * Creates an instance of AnimateManager.
     * https://easings.net/ja
     * 
     * @constructor
     */
    constructor() {
        this.Ease = {
            easeInOut: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; }
        };
    }
    /**
     * スクロールアニメーション
     *
     * @param {String} selector
     * @param {Number} duration
     * @param {Number} headerHeight
     */
    scrollToBySelector (selector,duration,headerHeight) {
        this.scrollToByElement(document.querySelector(selector),duration,headerHeight);
    }
    /**
     * スクロールアニメーション
     *
     * @param {HTMLElement} element
     * @param {Number} duration
     * @param {Number} headerHeight
     */
    scrollToByElement(element,duration,headerHeight){
        if(!element){
            return;
        }
        if(duration == undefined || duration == null){
            duration = 0;
        }
        if(!headerHeight){
            headerHeight = 0;
        }
        const targetPosition = element.getBoundingClientRect().top + window.scrollY - headerHeight;
        this.scrollTo(targetPosition,duration);
    }
    /**
     * スクロールアニメーション
     *
     * @param {Number} targetPosition
     * @param {Number} duration
     * @param {HTMLElement} scrollTarget
     */
    scrollTo (targetPosition,duration,scrollTarget) {
        if(!scrollTarget){
            scrollTarget = window;
        }
        const startPosition = scrollTarget == window ? ( document.documentElement.scrollTop || document.body.scrollTop ) : scrollTarget.scrollTop;
        requestAnimationFrame((nowTime)=>{
            this._loopForScrollTo(nowTime,nowTime,startPosition,targetPosition,duration,scrollTarget);
        });
    }
    /**
     * スクロールアニメーション再起処理
     *
     * @param {Number} nowTime
     * @param {Number} startTime
     * @param {Number} startPosition
     * @param {Number} targetPosition
     * @param {Number} duration
     * @param {HTMLElement} scrollTarget
     */
    _loopForScrollTo(nowTime,startTime,startPosition,targetPosition,duration,scrollTarget) {
        const time = nowTime - startTime;
        const normalizedTime = time / duration;
        if (normalizedTime < 1) {
            scrollTarget.scrollTo(0, startPosition + ((targetPosition - startPosition) * this.Ease.easeInOut(normalizedTime)));
            requestAnimationFrame((nowTime)=>{
                this._loopForScrollTo(nowTime,startTime,startPosition,targetPosition,duration,scrollTarget);
            });
        } else {
            scrollTarget.scrollTo(0, targetPosition);
        }
    }
}
/**
 * 共通処理
 *
 * @class Utils
 * @typedef {Utils}
 */
class Utils{
    /**
     * Creates an instance of Utils.
     *
     * @constructor
     */
    constructor() {}
    /**
     * ブラウザバック判定
     *
     * @static
     * @readonly
     * @type {boolean}
     */
    static get isBrowserBack(){
        const perfEntries = performance.getEntriesByType("navigation");
        let result = false;
        perfEntries.forEach((perfEntry) => {
            if(perfEntry.type == 'back_forward'){
                result = true;
            }
        });
        return result;
    }
    /**
     * URLが/challengeで終わるか否か
     *
     * @static
     * @readonly
     * @type {*}
     */
    static get isChallenge(){
        return /^.*\/challenge$/.test(location.pathname);
    }
    /**
     * イベントキャンセル
     *
     * @static
     * @param {Event} e
     */
    static cancelEvent(e){
        e.stopPropagation();/* キャプチャおよびバブリング段階において現在のイベントのさらなる伝播を阻止します。しかし、これは既定の動作の発生を妨げるものではありません。 */
        e.preventDefault();/* ユーザーエージェントに、このイベントが明示的に処理されない場合に、その既定のアクションを通常どおりに行うべきではないことを伝えます */
        e.stopImmediatePropagation();/* 呼び出されている同じイベントの他のリスナーを抑止します。同じイベントタイプで複数のリスナーが同じ要素に装着されている場合、追加された順番に呼び出されます。もし、そのような呼び出しの最中に stopImmediatePropagation() が呼び出された場合、残りのリスナーは呼び出されなくなります。 */
    }
    /**
     * classListを更新するためのメソッドチェーン
     *
     * @static
     * @param {*} elm
     * @returns {{ elm: any; add: (value: any) => ...; remove: (value: any) => ...; update: (add: any, value: any) => ...; switch: (addToLeft: any, value: any) => ...; }}
     */
    static classList(elm){
        const obj = {
            elm   : typeof elm === 'string' ? document.querySelectorAll(elm) : elm,
            add   : function(value){
                if(this.elm){
                    if(NodeList.prototype.isPrototypeOf(this.elm) || Array.isArray(this.elm)){
                        this.elm.forEach((_elm,i)=>{
                            _elm.classList.add(value);
                        });
                    }else{
                        this.elm.classList.add(value);
                    }
                }
                return this;
            },
            remove : function(value){
                if(this.elm){
                    if(NodeList.prototype.isPrototypeOf(this.elm) || Array.isArray(this.elm)){
                        this.elm.forEach((_elm,i)=>{
                            _elm.classList.remove(value);
                        });
                    }else{
                        this.elm.classList.remove(value);
                    }
                }
                return this;
            },
            update : function(add,value){
                if(this.elm){
                    if(add){
                        if(NodeList.prototype.isPrototypeOf(this.elm) || Array.isArray(this.elm)){
                            this.elm.forEach((_elm,i)=>{
                                _elm.classList.add(value);
                            });
                        }else{
                            this.elm.classList.add(value);
                        }
                    }else{
                        if(NodeList.prototype.isPrototypeOf(this.elm) || Array.isArray(this.elm)){
                            this.elm.forEach((_elm,i)=>{
                                _elm.classList.remove(value);
                            });
                        }else{
                            this.elm.classList.remove(value);
                        }
                    }
                }
                return this;
            },
            switch : function(addToLeft,value){
                if(this.elm){
                    if(NodeList.prototype.isPrototypeOf(this.elm) || Array.isArray(this.elm)){
                        if(1 < this.elm.length){
                            if(addToLeft){
                                this.elm[0].classList.add(value);
                                this.elm[1].classList.remove(value);
                            }else{
                                this.elm[0].classList.remove(value);
                                this.elm[1].classList.add(value);
                            }
                        }
                    }
                }
                return this;
            }
        };
        return obj;
    }
    /**
     * fetch
     * 
     * @static
     * @param {String} url
     * @returns {Promise}
     */
    static fetch(url){
        return new Promise((resolve,reject) => {
            fetch(url)
                .then((response)=>{
                    if (!response.ok) {
                        throw new Error();
                    }
                    return response.text();
                })
                .then((text)=>{
                    let hasError = false;
                    let obj;
                    try {
                        obj = JSON.parse(text.replace(/<section[^>]+>/,'').replace(/<\/section>/,'').replace(/\s/g,''));
                    } catch (error) {
                        hasError = true;
                    }
                    if(hasError){
                        reject(false);
                    }else{
                        resolve(obj);
                    }
                })
                .catch((error)=>{
                    reject(false);
                });
        });
    }
    /**
     * チェック済みのcheckbox,radioの値を取得
     *
     * @static
     * @param {String} inputName
     * @param {*} target
     * @returns {[]}
     */
    static getCheckedValuesByInputName(inputName,target){
        if(!target)target = document;
        let values = [];
        const inputs = target.querySelectorAll(`input[name="${inputName}"]`);
        inputs.forEach((input,i)=>{
            if(input.checked){
                values.push(input.value);
            }
        });
        return values;
    }
    /**
     * nameで指定した要素のvalueを配列で返す
     * glue指定の場合はglueでjoinした文字列を返す
     *
     * @static
     * @param {String} name
     * @param {*} target
     * @param {String} glue
     * @returns {*}
     */
    static getValuesByName(name,target,glue){
        return Utils.getValuesBySelector(`[name="${name}"]`,target,glue);
    }
    /**
     * selectorで指定した要素のvalueを配列で返す
     * glue指定の場合はglueでjoinした文字列を返す
     *
     * @static
     * @param {String} selector
     * @param {*} target
     * @param {String} glue
     * @returns {*}
     */
    static getValuesBySelector(selector,target,glue){
        if(!target)target = document;
        let values = [];
        const inputs = target.querySelectorAll(selector);
        inputs.forEach((input,i)=>{
            if(Utils.tagNameIs(input,'select') || (Utils.tagNameIs(input,'input',['checkbox','radio']) && input.checked) || (Utils.tagNameIs(input,'input') && !['checkbox','radio'].includes(input.type))){
                values.push(input.value);
            }
        });
        return typeof glue === 'undefined' ? values : values.join(glue);
    }
    /**
     * this.elements初期化
     *
     * @static
     * @param {*} instance
     * @param {*} target
     */
    static initDataElements(instance,target){
        if(!target)target = document;
        instance.elements.html = document.getElementsByTagName('html')[0];
        instance.elements.body = document.getElementsByTagName('body')[0];
        let key;
        for(key in instance.elements.selectors){
            this.updateDataElements(instance,key,target);
        }
    }
    /**
     * nameで指定した要素がcheckboxかどうか判定
     *
     * @static
     * @param {String} name
     * @param {*} target
     * @returns {boolean}
     */
    static isCheckboxByName(name,target){
        if(!target)target = document;
        const elms = target.querySelectorAll(`[name="${name}"]`);
        if(elms.length){
            return Utils.tagNameIs(elms[0],'input','checkbox');
        }
        return false;
    }
    /**
     * nameで指定した要素がradioかどうか判定
     *
     * @static
     * @param {String} name
     * @param {*} target
     * @returns {boolean}
     */
    static isRadioByName(name,target){
        if(!target)target = document;
        const elms = target.querySelectorAll(`[name="${name}"]`);
        if(elms.length){
            return Utils.tagNameIs(elms[0],'input','radio');
        }
        return false;
    }
    /**
     * nameで指定した要素がselectタグかどうか判定
     *
     * @static
     * @param {String} name
     * @param {*} target
     * @returns {boolean}
     */
    static isSelectByName(name,target){
        if(!target)target = document;
        const elms = target.querySelectorAll(`[name="${name}"]`);
        if(elms.length){
            return Utils.tagNameIs(elms[0],'select');
        }
        return false;
    }
    /**
     * nameで指定した要素へvalueを設定する
     *
     * @static
     * @param {String} name
     * @param {*} value
     * @param {*} target
     */
    static setValueByName(name,value,target){
        if(!target)target = document;
        const elms = target.querySelectorAll(`[name="${name}"]`);
        elms.forEach((elm,i)=>{
            elm.value = value;
        });
    }
    /**
     * queryで指定した要素へvalueを設定する
     *
     * @static
     * @param {String} query
     * @param {*} value
     * @param {*} target
     */
    static setValueBySelector(query,value,target){
        if(!target)target = document;
        const elms = target.querySelectorAll(query);
        elms.forEach((elm,i)=>{
            elm.value = value;
        });
    }
    /**
     * nodeListで指定した要素へvalueを設定する
     *
     * @static
     * @param {NodeList} nodeList
     * @param {*} value
     */
    static setValueByNodeList(nodeList,value){
        nodeList.forEach((elm,i)=>{
            elm.value = value;
        });
    }
    /**
     * nameで指定した要素のdisabledを設定する
     *
     * @static
     * @param {String} name
     * @param {Boolean} disabled
     * @param {*} target
     */
    static setDisabledByName(name,disabled,target){
        if(!target)target = document;
        const elms = target.querySelectorAll(`[name="${name}"]`);
        elms.forEach((elm,i)=>{
            elm.disabled = disabled;
        });
    }
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
     * 指定要素の指定イベント発火
     *
     * @static
     * @param {HTMLElement} element
     * @param {String} eventName
     * @returns {Boolean}
     */
    static triggerEvent(element, eventName){
        const evt = new CustomEvent(eventName, {bubbles:true,cancelable:true});
        return element.dispatchEvent(evt);
    }
    /**
     * 指定要素の指定イベント発火(古いバージョン)
     *
     * @static
     * @param {HTMLElement} element
     * @param {String} eventName
     * @returns {Boolean}
     */
    static triggerEventOld(element, eventName){
        const evt = document.createEvent('HTMLEvents')
        evt.initEvent(eventName, true, true);
        return element.dispatchEvent(evt);
    }
    /**
     * this.elements更新
     *
     * @static
     * @param {*} instance
     * @param {*} key
     * @param {*} target
     */
    static updateDataElements(instance,key,target){
        if(!target)target = document;
        const keys = typeof key === 'string' ? [key] : key;
        keys.forEach((_key,i)=>{
            if(instance.elements.selectors[_key]) {
                if (/^.+All$/.test(_key)) {
                    instance.elements[_key] = target.querySelectorAll(instance.elements.selectors[_key]);
                }else{
                    instance.elements[_key] = target.querySelector(instance.elements.selectors[_key]);
                    if (/^.+Clone$/.test(_key)) {
                        instance.elements[_key] = instance.elements[_key].cloneNode(true);
                    }
                }
            }
        });
    }

    /**
     * initWithScrollY
     *
     * @static
     */
    static initWithScrollY(){
        let scrollY = localStorage.getItem('scrollKey');
        if(!scrollY){
            return;
        }
        localStorage.removeItem('scrollKey');
        scrollY = Number(scrollY);
        window.scrollTo(0, scrollY);
    }
    /**
     * ローカルストレージ取得
     *
     * @static
     * @param {String} key
     * @param {Boolean} remove
     * @returns {*}
     */
    static getLS(key,remove){
        const value = localStorage.getItem(key);
        if(remove){
            localStorage.removeItem(key);
        }
        return value;
    }
    /**
     * スクロール位置を保存しつつリロード
     *
     * @static
     * @param {*} delay
     */
    static reloadWithScrollY(delay){
        if(delay){
            setTimeout(()=>{
                Utils.reloadWithScrollY();
            },delay);
        }else{
            localStorage.setItem('scrollKey',window.scrollY);
            location.reload();
        }
    }
    /**
     * ローカルストレージ保存
     *
     * @static
     */
    static setLS(key,value){
        localStorage.setItem(key,value);
    }
    /**
     * スクロール位置を保存
     *
     * @static
     */
    static setScrollYToLS(){
        localStorage.setItem('scrollKey',window.scrollY);
    }
}
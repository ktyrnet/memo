/**
 * description
 */
class MyClass{
    constructor() {
    }
    /* getter */
    get isPc(){
        const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        return 700 <= windowWidth;
    }
    get isSp(){
        return !this.isPc;
    }
    /* setter */
    set current(newValue){
        /* this.datas.push(newValue); */
    }
    /**
     * 初期化
     */
    init(){
        this.elements = {
            selectors : {
                html            : '',
                body            : '',
                apiAll          : '[href^="/api/"]'
            }
        };
        Utils.initDataElements(this);
    }
    /** initDataElementsをクラスに内包する場合 */
    /**
     * this.elements初期化
     *
     * @static
     * @param {*} instance
     * @param {*} target
     */
    initDataElements(){
        this.elements.html = document.getElementsByTagName('html')[0];
        this.elements.body = document.getElementsByTagName('body')[0];
        let key;
        for(key in this.elements.selectors){
            this.updateDataElements(this,key);
        }
    }
    /**
     * this.elements更新
     *
     * @static
     * @param {*} instance
     * @param {*} key
     * @param {*} target
     */
    updateDataElements(instance,key,target){
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
    executeApi(url,isJson,callback,errorCallback){
        fetch(url)
        .then((response)=>{
            if (!response.ok) {
                throw new Error();
            }
            return isJson ? response.json() : response.text();
        })
        .then((jsonOrText)=>{
            if(callback){
                callback(jsonOrText);
            }
        })
        .catch((error)=>{
            if(errorCallback){
                errorCallback(error);
            }
        });
    }
}
window.addEventListener('DOMContentLoaded',(e) => {
    const mc = new MyClass();
    mc.init();
});
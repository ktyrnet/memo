import { useEffect,useState } from "react";
import parse from "html-react-parser";

type params = {
    wrapper  : string;
    url      : string;
};
function FetchData(props:params){
    const {wrapper,url} = props;
    const [html, setHtml] = useState<string>("");
    const wrapperElm:HTMLElement | null = document.querySelector(wrapper);

    useEffect(() => {
        fetch(url)
        .then((response)=>{
            if (!response.ok) {
                throw new Error();
            }
            return response.text();
        })
        .then((text) => {
            if(text.replace(/\s/g,'')){
                setHtml(text);
                if(wrapperElm){
                    wrapperElm.classList.remove("hide");
                }
            }
        })
        .catch((error) => {

        });
    }, []);

    return <>{html == "" ? "" : parse(html)}</>;
};
FetchData.defaultProps = {
    wrapper  : '',
    url      : '',
};
export default FetchData;
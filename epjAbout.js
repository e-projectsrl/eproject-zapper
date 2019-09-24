define([], function () {
    'use strict';

    let epjLogo64 = "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";

    return {
        component: "text",
        label: function(layout) {
            let t = $("div[tid='EpInfo']"); 
            t.html(`<div style="margin:15px;text-align:center;">
                        <b>${layout.extensionMeta.name}</b>
                        <br />
                        version <b>${layout.extensionMeta.version}</b>
                        <br />
                        by <b>${layout.extensionMeta.author}</b>
                        <br />
                        <a href="${layout.extensionMeta.homepage}" target="_blank">
                            <img style="max-width:100%;height:auto;margin-top:10px;" src="data:image/png;base64,${epjLogo64}"></img>
                        </a>
                    </div>`
                );
        }
    };
});
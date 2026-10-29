export const themeScript = `(function(){try{
var t=localStorage.getItem('cm-theme')||'dark';
var a=localStorage.getItem('cm-accent')||'green';
document.documentElement.setAttribute('data-theme',t);
document.documentElement.setAttribute('data-accent',a);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

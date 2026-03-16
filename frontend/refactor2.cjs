const fs = require('fs');

const path = '/Users/jason/Documents/code/what2eat/frontend/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const returnIdx = content.indexOf('return (');
let preReturn = content.substring(0, returnIdx);

if (!preReturn.includes('activeIndex')) {
    const expIdx = preReturn.indexOf('const expiringSoon =');
    preReturn = preReturn.substring(0, expIdx) + 'const [activeIndex, setActiveIndex] = useState(0);\n    ' + preReturn.substring(expIdx);
}

const replacementPath = '/Users/jason/Documents/code/what2eat/frontend/HomePageReplacement.txt';
const newJsx = fs.readFileSync(replacementPath, 'utf8');

fs.writeFileSync(path, preReturn + newJsx);
console.log('Successfully saved!');
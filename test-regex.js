const fs = require('fs');

const importJson = `[
  {
    "key": "VUL-426",
    
    "url": https://credmais.atlassian.net/browse/VUL-426,
    
    "tipoItem": "Epic",
    "impacto": "* Abuso imediato da API Key do Google: Possibilidade de chamadas não autorizadas a serviços\\n* Para testar a regex: https://google.com , não deve ser alterado",
    "descricao": "A análise estática realizada com MobSF"
  }
]`;

try {
  let lines = importJson.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*"[a-zA-Z0-9_]+"\s*:\s*)(https?:\/\/[^,\s]+)(,?)\s*$/);
    if (match) {
      lines[i] = match[1] + '"' + match[2] + '"' + match[3];
    }
  }
  let fixedJson = lines.join('\n');
  
  console.log("Fixed JSON sample:", fixedJson.substring(0, 150));
  
  const parsedData = new Function("return " + fixedJson.trim())();
  console.log("Sucesso! Array de tamanho:", parsedData.length);
} catch (err) {
  console.error("Erro no regex fallback:", err.message);
}

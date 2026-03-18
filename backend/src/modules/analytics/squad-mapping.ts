
export const SQUAD_MAPPING: Record<string, { tribo: string, po: string, techLead: string, appSec: string, sre: string }> = {
    "Uso de cartões": {
        tribo: "Produtos - Cartões",
        po: "Rita Vieira",
        techLead: "Edgard",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Pagamento e financiamento da fatura de cartões": {
        tribo: "Produtos - Cartões",
        po: "Rita Vieira",
        techLead: "Edgard",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Motor de parcelamento de fatura": {
        tribo: "Produtos - Cartões",
        po: "Leticia Santos",
        techLead: "Thiago Hidalgo",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Contratação, uso e pagamento de empréstimo": {
        tribo: "Produtos - Cartões",
        po: "Leticia Santos",
        techLead: "Silvana Bertier",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Motor de empréstimo": {
        tribo: "Produtos - Ecossistema",
        po: "Rafael Luciano",
        techLead: "Edgard Fernandes",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Contratação, uso e pagamento de seguros e assistências": {
        tribo: "Produtos - Ecossistema",
        po: "Rafael Luciano",
        techLead: "Thiago Hidalgo",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Hub de seguros (conexão com seguradoras)": {
        tribo: "Produtos - Ecossistema",
        po: "Rafael Luciano",
        techLead: "Edgard Fernandes",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Abertura, ativação, uso e gestão de conta": {
        tribo: "Produtos - Ecossistema",
        po: "Rafael Luciano",
        techLead: "Thiago Hidalgo",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Conta (conexão com parceiros)": {
        tribo: "Produtos - Ecossistema",
        po: "Wil Lima",
        techLead: "Claudio Barbosa",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Ativação, uso e gestão de pix e open finance": {
        tribo: "Produtos - Ecossistema",
        po: "Wil Lima",
        techLead: "Claudio Barbosa",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Pix e open finance (conexão com parceiros)": {
        tribo: "Produtos - Ecossistema",
        po: "Fernanda Braga",
        techLead: "Claudio Barbosa",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "Canais do lojista (Websystem, Websystem Adm, Portal do Lojista, Express)": {
        tribo: "Produtos - Ecossistema",
        po: "Fernanda Braga",
        techLead: "Claudio Barbosa",
        sre: "Dieizon Ferreira",
        appSec: "Higor Pascoa"
    },
    "APIs para parceiros": {
        tribo: "Produtos - Ecossistema",
        po: "Amanda Camanho",
        techLead: "Thiago Hidalgo",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Apps PL": {
        tribo: "Produtos - Ecossistema",
        po: "Amanda Camanho",
        techLead: "Thiago Hidalgo",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "App Mais": {
        tribo: "Produtos - Ecossistema",
        po: "Daniela Siqueira",
        techLead: "Edgard Fernandes",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Créd. e riscos + Credline": {
        tribo: "Produtos - Ecossistema",
        po: "Daniela Siqueira",
        techLead: "Edgard Fernandes",
        sre: "Alexandre Makray",
        appSec: "Jean Almeida"
    },
    "Recuperação de crédito": {
        tribo: "Crédito",
        po: "Carolina Toledo",
        techLead: "Roberto Brancalion",
        sre: "Leonardo Alves",
        appSec: "Weverton Oliveira"
    },
    "Prevenção a fraude e cobrança": {
        tribo: "Crédito",
        po: "Thomas",
        techLead: "Anderson Mota",
        sre: "Leonardo Alves",
        appSec: "Weverton Oliveira"
    },
    "Portal web de cartões": {
        tribo: "Atendimento",
        po: "Thomas",
        techLead: "Anderson Mota",
        sre: "Leonardo Alves",
        appSec: "Weverton Oliveira"
    },
    "Canais de atendimento": {
        tribo: "Atendimento",
        po: "Wesley Oliveira",
        techLead: "Helio Alves",
        sre: "Anderson Costa",
        appSec: "N/A"
    }
};

export function getSquadMetadata(squadName: string) {
    // Try exact match first
    if (SQUAD_MAPPING[squadName]) return SQUAD_MAPPING[squadName];
    
    // Fuzzy match (contains)
    const key = Object.keys(SQUAD_MAPPING).find(k => squadName.includes(k) || k.includes(squadName));
    if (key) return SQUAD_MAPPING[key];

    return {
        tribo: "N/A",
        po: "N/A",
        techLead: "N/A",
        appSec: "N/A",
        sre: "N/A"
    };
}


import { getDeepSeekChatCompletion } from "@/services/deepseekService";
import { eventTemplateService, EventTemplate } from "@/services/eventTemplateService";
import { PlayerProfile } from "@/lib/types";

export interface NarrativeContext {
  playerProfile: PlayerProfile;
  eventType: string;
  eventSubtype?: string | null;
  week?: number;
  minute?: number;
  score?: string;
  rel?: string;
  choice?: 'A' | 'B' | number;
  roll?: number;
  dc?: number;
  lanceType?: string;
  userText?: string;
  weeksOut?: number;
  [key: string]: any;
}

export interface NarrativeResponse {
  narrative: string;
  options?: string[];
  nextEvent?: { labelA: string; labelB: string };
  type?: string;
  outcome?: string;
  dc?: number[];
  deltas?: { stat: string; delta: number }[] | { attr: string; delta: number }[];
  tone?: number;
  subtype?: string;
  json?: any;
}

export class NarrativeService {
  /**
   * Gera uma narrativa baseada em um template e contexto
   */
  public static async generateNarrative(context: NarrativeContext): Promise<NarrativeResponse> {
    try {
      // Obter o template apropriado
      const template = await eventTemplateService.getTemplate(context.eventType, context.eventSubtype);
      if (!template) {
        console.error(`Template não encontrado para ${context.eventType}/${context.eventSubtype}`);
        return { narrative: this.generateFallbackNarrative(context) };
      }

      // Preencher o template com os valores do contexto
      const filledPrompt = this.fillPromptTemplate(template.prompt_template, context);

      // Chamar a API DeepSeek com o prompt preenchido
      const response = await getDeepSeekChatCompletion([
        { role: "system", content: template.system_prompt },
        { role: "user", content: filledPrompt }
      ], { temperature: 0.8 });

      if (!response || !response.content) {
        return { narrative: this.generateFallbackNarrative(context) };
      }
      
      // Parse do conteúdo para extrair narrativa e metadados em JSON
      return this.parseNarrativeResponse(response.content, context);
      
    } catch (error) {
      console.error("Erro ao gerar narrativa:", error);
      return { narrative: this.generateFallbackNarrative(context) };
    }
  }

  /**
   * Preenche um template de prompt com valores do contexto
   */
  private static fillPromptTemplate(template: string, context: NarrativeContext): string {
    let filledTemplate = template;
    
    // Substitui variáveis comuns
    if (context.playerProfile) {
      filledTemplate = filledTemplate
        .replace(/\{name\}/g, context.playerProfile.name)
        .replace(/\{age\}/g, String(context.playerProfile.age))
        .replace(/\{nat\}/g, context.playerProfile.nationality)
        .replace(/\{pos\}/g, context.playerProfile.position)
        .replace(/\{club\}/g, context.playerProfile.startClub);
    }
    
    // Substitui outras variáveis comuns
    filledTemplate = filledTemplate
      .replace(/\{week\}/g, String(context.week || 1))
      .replace(/\{minute\}/g, String(context.minute || 0))
      .replace(/\{score\}/g, context.score || "0-0")
      .replace(/\{rel\}/g, context.rel || "0")
      .replace(/\{Lance\}/g, context.lanceType || "ATAQUE_FRANCO")
      .replace(/\{roll\}/g, String(context.roll || 10))
      .replace(/\{dc\}/g, String(context.dc || 10))
      .replace(/\{textoUser\}/g, context.userText || "");
      
    // Substitui choice como 0 ou 1 para templates que usam índice
    if (context.choice !== undefined) {
      const choiceIndex = context.choice === 'A' ? 0 : 1;
      filledTemplate = filledTemplate.replace(/\{0\|1\}/g, String(choiceIndex));
    }
    
    return filledTemplate;
  }

  /**
   * Parse a resposta da IA para estruturar os dados
   */
  private static parseNarrativeResponse(content: string, context: NarrativeContext): NarrativeResponse {
    try {
      // Inicializa a resposta básica
      const response: NarrativeResponse = {
        narrative: content
      };
      
      // Tenta encontrar JSON na resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonContent = JSON.parse(jsonMatch[0]);
          response.json = jsonContent;
          
          // Extrai campos específicos para a interface NarrativeResponse
          if (jsonContent.narrative) {
            response.narrative = jsonContent.narrative;
          }
          
          if (jsonContent.options) {
            response.options = jsonContent.options;
          }
          
          if (jsonContent.nextEvent) {
            response.nextEvent = jsonContent.nextEvent;
          }
          
          if (jsonContent.type) {
            response.type = jsonContent.type;
          }
          
          if (jsonContent.outcome) {
            response.outcome = jsonContent.outcome;
          }
          
          if (jsonContent.dc) {
            response.dc = jsonContent.dc;
          }
          
          if (jsonContent.deltas) {
            response.deltas = jsonContent.deltas;
          }
          
          if (jsonContent.tone !== undefined) {
            response.tone = jsonContent.tone;
          }
          
          if (jsonContent.subtype) {
            response.subtype = jsonContent.subtype;
          }
        } catch (e) {
          console.error("Erro ao fazer parse do JSON na resposta:", e);
        }
      }
      
      // Se não encontrou JSON ou não conseguiu extrair a narrativa, usa todo o conteúdo como narrativa
      if (!response.narrative || response.narrative === content) {
        // Remove partes técnicas da resposta para ficar só com a narrativa
        let cleanNarrative = content
          .replace(/\{[\s\S]*\}/, '') // Remove blocos JSON
          .trim();
          
        if (cleanNarrative) {
          response.narrative = cleanNarrative;
        } else {
          response.narrative = this.generateFallbackNarrative(context);
        }
      }
      
      return response;
    } catch (error) {
      console.error("Erro ao fazer parse da resposta da narrativa:", error);
      return { narrative: this.generateFallbackNarrative(context) };
    }
  }

  /**
   * Gera uma narrativa de fallback caso a IA falhe
   */
  private static generateFallbackNarrative(context: NarrativeContext): string {
    const { playerProfile, eventType, eventSubtype } = context;
    
    if (!playerProfile) {
      return "<cyan>Um novo evento aconteceu na sua carreira.</cyan>";
    }
    
    switch (eventType) {
      case 'INTRO':
        return `<cyan>Bem-vindo à sua jornada no mundo do futebol! Você é ${playerProfile.name}, um talentoso ${playerProfile.position} de ${playerProfile.age} anos, chegando ao ${playerProfile.startClub} para iniciar sua carreira.</cyan>`;
      
      case 'MACRO':
        if (eventSubtype === 'TREINO_TECNICO') {
          return `<cyan>${playerProfile.name} participa de um treino técnico intenso, focando em suas habilidades fundamentais.</cyan>`;
        } else if (eventSubtype === 'TREINO_FISICO') {
          return `<cyan>O preparador físico montou uma série de exercícios para melhorar seu condicionamento.</cyan>`;
        } else if (eventSubtype === 'COLETIVA_IMPRENSA') {
          return `<cyan>Os jornalistas aguardam suas declarações na sala de imprensa.</cyan>`;
        }
        return `<cyan>Mais um dia de trabalho no ${playerProfile.startClub}.</cyan>`;
      
      case 'MICRO_PRE':
        return `<cyan>Uma oportunidade surge para ${playerProfile.name} durante a partida!</cyan>`;
      
      case 'EVENT':
        if (eventSubtype === 'LESAO_GRAVE') {
          return `<magenta>${playerProfile.name} sofreu uma lesão e precisará de tempo para se recuperar.</magenta>`;
        }
        return `<yellow>Um evento importante aconteceu em sua carreira.</yellow>`;
      
      default:
        return `<cyan>${playerProfile.name} enfrenta mais um desafio em sua carreira.</cyan>`;
    }
  }
}

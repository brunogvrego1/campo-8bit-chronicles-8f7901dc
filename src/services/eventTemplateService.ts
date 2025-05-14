
import { supabase } from "@/integrations/supabase/client";

export interface EventTemplate {
  id: string;
  event_type: string;
  event_subtype: string | null;
  prompt_template: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export class EventTemplateService {
  private static instance: EventTemplateService;
  private templateCache: Map<string, EventTemplate> = new Map();
  private isLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): EventTemplateService {
    if (!EventTemplateService.instance) {
      EventTemplateService.instance = new EventTemplateService();
    }
    return EventTemplateService.instance;
  }

  /**
   * Carrega todos os templates da base de dados
   */
  public async loadTemplates(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const { data, error } = await supabase
        .from("event_templates")
        .select("*");

      if (error) {
        console.error("Erro ao carregar templates:", error);
        return;
      }

      // Limpa o cache antes de recarregar
      this.templateCache.clear();

      // Armazena os templates no cache para acesso rápido
      data.forEach((template: EventTemplate) => {
        const key = this.buildTemplateKey(template.event_type, template.event_subtype);
        this.templateCache.set(key, template);
      });

      this.isLoaded = true;
      console.log(`Carregados ${data.length} templates de eventos.`);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
    }
  }

  /**
   * Obtém um template específico pelo tipo e subtipo
   */
  public async getTemplate(eventType: string, eventSubtype?: string | null): Promise<EventTemplate | null> {
    if (!this.isLoaded) {
      await this.loadTemplates();
    }

    const key = this.buildTemplateKey(eventType, eventSubtype);
    
    // Tenta obter o template específico primeiro
    const template = this.templateCache.get(key);
    if (template) {
      return template;
    }

    // Se não encontrou com subtipo, tenta um template genérico do tipo
    if (eventSubtype) {
      const genericKey = this.buildTemplateKey(eventType, null);
      return this.templateCache.get(genericKey) || null;
    }

    return null;
  }

  /**
   * Constrói uma chave para o cache de templates
   */
  private buildTemplateKey(eventType: string, eventSubtype?: string | null): string {
    return eventSubtype ? `${eventType}:${eventSubtype}` : `${eventType}`;
  }
}

// Exporta uma instância singleton
export const eventTemplateService = EventTemplateService.getInstance();

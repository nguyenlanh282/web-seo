import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { RedisService } from '../redis/redis.service'

export type SerpResult = {
  position: number
  title: string
  url: string
  snippet: string
  wordCount?: number
  headings?: string[]
  metaDescription?: string
}

export type SerpData = {
  keyword: string
  totalResults: number
  results: SerpResult[]
  relatedKeywords: string[]
  peopleAlsoAsk: string[]
  cachedAt: string
}

@Injectable()
export class SerpService {
  private readonly logger = new Logger(SerpService.name)
  private readonly CACHE_TTL = 86400 // 24 hours

  constructor(private readonly redis: RedisService) {}

  async fetchSerpData(keyword: string): Promise<SerpData> {
    // Check cache first
    const cacheKey = `serp:cache:${keyword.toLowerCase().replace(/\s+/g, '-')}`
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.log(`SERP cache hit for: ${keyword}`)
      return JSON.parse(cached)
    }

    // Fetch from SerpAPI
    this.logger.log(`Fetching SERP for: ${keyword}`)
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: keyword,
          api_key: process.env.SERP_API_KEY,
          hl: 'vi',
          gl: 'vn',
          num: 10,
        },
        timeout: 15000,
      })

      const data = response.data
      const results: SerpResult[] = (data.organic_results || []).slice(0, 10).map((r: any, i: number) => ({
        position: i + 1,
        title: r.title || '',
        url: r.link || '',
        snippet: r.snippet || '',
        wordCount: this.estimateWordCount(r.snippet || ''),
        metaDescription: r.snippet || '',
      }))

      const serpData: SerpData = {
        keyword,
        totalResults: data.search_information?.total_results || 0,
        results,
        relatedKeywords: (data.related_searches || []).map((s: any) => s.query),
        peopleAlsoAsk: (data.related_questions || []).map((q: any) => q.question),
        cachedAt: new Date().toISOString(),
      }

      // Cache for 24 hours
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(serpData))
      return serpData
    } catch (error: any) {
      this.logger.error(`SerpAPI error: ${error.message}`)
      // Return minimal data on error
      return {
        keyword,
        totalResults: 0,
        results: [],
        relatedKeywords: [],
        peopleAlsoAsk: [],
        cachedAt: new Date().toISOString(),
      }
    }
  }

  private estimateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length * 10 // rough estimate
  }
}

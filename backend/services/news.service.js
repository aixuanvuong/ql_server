// filepath: backend/services/news.service.js
const Parser = require('rss-parser');

class NewsService {
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // Các nguồn tin tức RSS phong phú và uy tín
    this.defaultFeeds = {
      vnexpress_tonghop: 'https://vnexpress.net/rss/tin-moi-nhat.rss',
      vnexpress_congnghe: 'https://vnexpress.net/rss/so-hoa.rss',
      tuoitre_tonghop: 'https://tuoitre.vn/rss/tin-moi-nhat.rss',
      tuoitre_congnghe: 'https://tuoitre.vn/rss/nhip-song-so.rss',
      thanhnien_congnghe: 'https://thanhnien.vn/rss/cong-nghe.rss',
      hackernews: 'https://news.ycombinator.com/rss'
    };
  }

  /**
   * Định nghĩa MCP Tool definition theo chuẩn OpenAI Tool Calling
   */
  getToolDefinition() {
    return {
      type: 'function',
      function: {
        name: 'fetch_quick_news',
        description: 'Lấy tin tức mới nhất, tin nóng trong ngày từ các đầu báo uy tín (VnExpress, Tuổi Trẻ, Hacker News, v.v.) qua luồng RSS. Dùng tool này khi người dùng hỏi về tin tức mới nhất, tin công nghệ, tình hình thời sự hoặc tin nóng hôm nay.',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['tonghop', 'congnghe', 'hackernews', 'all'],
              description: 'Chủ đề tin tức cần lấy: "tonghop" (Tin mới nhất/thời sự), "congnghe" (Tin công nghệ/số hóa), "hackernews" (Công nghệ & lập trình quốc tế), "all" (Tổng hợp nhiều nguồn).'
            },
            limit: {
              type: 'number',
              description: 'Số lượng bài viết cần lấy (mặc định: 5, tối đa: 15)'
            }
          }
        }
      }
    };
  }

  /**
   * Xóa các thẻ HTML trong nội dung/mô tả của RSS item
   */
  cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]+>/g, '') // Bỏ HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Đọc và trích xuất tin tức từ các nguồn RSS
   * @param {object} params
   * @param {string} [params.category='tonghop']
   * @param {number} [params.limit=5]
   */
  async fetchNews({ category = 'tonghop', limit = 5 } = {}) {
    const maxArticles = Math.min(Math.max(1, limit || 5), 15);
    const targetFeeds = [];

    if (category === 'congnghe') {
      targetFeeds.push(
        { source: 'VnExpress Số Hóa', url: this.defaultFeeds.vnexpress_congnghe },
        { source: 'Tuổi Trẻ Công Nghệ', url: this.defaultFeeds.tuoitre_congnghe }
      );
    } else if (category === 'hackernews') {
      targetFeeds.push(
        { source: 'Hacker News', url: this.defaultFeeds.hackernews }
      );
    } else if (category === 'all') {
      targetFeeds.push(
        { source: 'VnExpress Mới Nhất', url: this.defaultFeeds.vnexpress_tonghop },
        { source: 'Tuổi Trẻ Mới Nhất', url: this.defaultFeeds.tuoitre_tonghop },
        { source: 'VnExpress Số Hóa', url: this.defaultFeeds.vnexpress_congnghe }
      );
    } else {
      // Mặc định: tonghop
      targetFeeds.push(
        { source: 'VnExpress', url: this.defaultFeeds.vnexpress_tonghop },
        { source: 'Tuổi Trẻ', url: this.defaultFeeds.tuoitre_tonghop }
      );
    }

    const allArticles = [];

    for (const feed of targetFeeds) {
      try {
        console.log(`[News Service] 📰 Đang tải RSS từ ${feed.source} (${feed.url})...`);
        const parsed = await this.parser.parseURL(feed.url);

        if (parsed && parsed.items && parsed.items.length > 0) {
          const sliceItems = parsed.items.slice(0, maxArticles);
          for (const item of sliceItems) {
            allArticles.push({
              source: feed.source,
              title: item.title ? item.title.trim() : 'Không có tiêu đề',
              link: item.link || '',
              pubDate: item.pubDate || item.isoDate || '',
              snippet: this.cleanHtml(item.contentSnippet || item.content || item.summary || '')
            });
          }
        }
      } catch (feedErr) {
        console.warn(`[News Service] ⚠️ Lỗi đọc RSS từ ${feed.source}:`, feedErr.message);
      }
    }

    if (allArticles.length === 0) {
      return {
        success: false,
        message: 'Không thể kết nối hoặc không tìm thấy bài viết nào từ các luồng RSS.',
        articles: []
      };
    }

    // Lấy đúng số lượng bài yêu cầu
    const finalArticles = allArticles.slice(0, maxArticles);

    return {
      success: true,
      category: category,
      count: finalArticles.length,
      articles: finalArticles
    };
  }
}

module.exports = new NewsService();

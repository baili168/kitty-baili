import { kitty, req, createTestEnv } from 'utils'

export default class duonaovod implements Handle {
  getConfig() {
    return <Iconfig>{
      id: 'duonaovod',
      name: '多瑙影院',
      api: "https://donaotv.xyz",
      nsfw: false,
      type: 1,
      extra: {
        gfw: false,
        searchLimit: 12,
      }
    }
  }

  async getCategory() {
    return <ICategory[]>[
      { text: "首页", id: "/" },
      { text: "电影", id: "/video/dy/101.html" },
      { text: "电视剧", id: "/video/tv/202.html" },
      { text: "综艺", id: "/video/zy/302.html" },
      { text: "动漫", id: "/video/dm/401.html" },
    ]
  }

  async getHome() {
    const cate = env.get('category')
    const page = env.get('page')
    if (cate == "/") {
      const $ = kitty.load(await req(env.baseUrl))
      const banner = $(".balist_item").toArray().map(item => {
        const a = $(item).find("a")
        const id = a.attr("href") || ""
        const title = $(item).find(".vodlist_title").text().trim()
        const sub = $(item).find(".vodlist_sub").text().trim()
        const cover = a.attr("data-background") || ""
        return <IMovie>{ id, title, cover, remark: sub }
      })
      const list = $(".vodlist_item").toArray().map(item => {
        const a = $(item).find(".vodlist_thumb")
        const id = a.attr("href") || ""
        const title = $(item).find(".vodlist_title").text().trim()
        const sub = $(item).find(".vodlist_sub").text().trim()
        const cover = a.attr("data-original") || ""
        const remark = $(item).find(".pic_text").text().trim()
        return <IMovie>{ id, title, cover, remark, sub }
      })
      return <IHomeData>{
        type: 'complex',
        data: [
          { type: "banner", videos: banner },
          {
            type: "markdown", extra: {
              markdown: `
> 欢迎使用小猫影视(${kitty.VERSION})
> 该源仅做测试使用，不可用于其他用途
> 飞机交流群: https://t.me/catmovie1145
> 小猫其他指南: https://xmpro.netlify.app
`
            }
          },
          { type: "list", title: "今日热播", videos: list },
        ],
      }
    }
    const url = `${env.baseUrl}${cate}`
    const $ = kitty.load(await req(url))
    return $(".vodlist_item").toArray().map(item => {
      const a = $(item).find(".vodlist_thumb")
      const id = a.attr("href") || ""
      const title = $(item).find(".vodlist_title").text().trim()
      const sub = $(item).find(".vodlist_sub").text().trim()
      const cover = a.attr("data-original") || ""
      const remark = $(item).find(".pic_text").text().trim()
      return <IMovie>{ id, title, cover, remark, sub }
    })
  }

  async getDetail() {
    const id = env.get("movieId")
    const url = `${env.baseUrl}${id}`
    const $ = kitty.load(await req(url))
    // Get description from meta or desc tab
    let desc = $("meta[name='description']").attr("content") || ""
    // Get playlist from play links
    const tabs = ["立即播放"]
    const playlistLinks = $(".content_playlist li a").toArray().map(item => {
      const id = $(item).attr("href") || ""
      const text = $(item).text().trim()
      return <IPlaylistVideo>{ id, text }
    })
    const playlist = tabs.map((title, index) => {
      return <IPlaylist>{ title, videos: playlistLinks }
    })
    return <IMovie>{ desc, playlist }
  }

  async getSearch() {
    const wd = env.get("keyword")
    const page = env.get("page")
    const url = `${env.baseUrl}/video/search.html?searchKey=${encodeURIComponent(wd || '')}`
    const $ = kitty.load(await req(url))
    return $(".vodlist_item").toArray().map(item => {
      const a = $(item).find(".vodlist_thumb")
      const id = a.attr("href") || ""
      const title = $(item).find(".vodlist_title").text().trim()
      const sub = $(item).find(".vodlist_sub").text().trim()
      const cover = a.attr("data-original") || ""
      return <IMovie>{ id, title, cover, remark: "", desc: sub }
    })
  }

  async parseIframe() {
    const iframe = env.get<string>("iframe")
    const html = await req(`${env.baseUrl}${iframe}`)
    const $ = kitty.load(html)
    // Extract playurl from the encoded variable
    const scriptText = $("script").toArray()
      .map(s => $(s).text().trim())
      .find(t => t.includes("playurl="))

    if (!scriptText) return ""

    // Try to find and decode the playurl
    const match = scriptText.match(/playurl\s*=\s*T\s*\(\s*'([^']+)'\s*\)/)
    if (!match) return ""

    // Custom decoder - this is a simple substitution cipher
    // The encoding uses Chinese characters as a lookup table
    const encoded = match[1]
    const decoder = this.createDecoder()
    let playurl = ""
    try {
      playurl = decoder(encoded)
    } catch {
      return ""
    }

    if (playurl.includes(".m3u8")) {
      return playurl
    }
    // If it's not m3u8, try to fetch it as an iframe
    return this.parseIframeUrl(playurl)
  }

  private createDecoder() {
    return (str: string) => {
      // Step 1: Remove last 3 chars
      let s = str.slice(0, -3)
      // Step 2: Reverse string
      s = s.split('').reverse().join('')
      // Step 3: Standard base64 decode (no custom mapping needed - the reversed string is already in standard base64)
      const decoded = atob(s)
      // Step 4: Decode URI component
      return decodeURIComponent(decoded)
    }
  }

  private async parseIframeUrl(url: string): Promise<string> {
    try {
      const html = await req(url)
      const $ = kitty.load(html)
      // Check if there's an iframe
      const iframeSrc = $("iframe").attr("src")
      if (iframeSrc) {
        // Recursively parse the iframe
        return this.parseIframeUrl(iframeSrc)
      }
      // Try to find m3u8 URL directly
      const m3u8Match = html.match(/"url"\s*:\s*"([^"]+\.m3u8)"/)
      if (m3u8Match) {
        return m3u8Match[1].replaceAll("\\/", "/")
      }
      return url
    } catch {
      return url
    }
  }
}

const env = createTestEnv("https://donaotv.xyz")

import { kitty, req, createTestEnv } from 'utils'

export default class mxvod implements Handle {
  getConfig() {
    return <Iconfig>{
      id: 'mxvod',
      name: 'MXVOD',
      api: "https://iuzvod.com",
      nsfw: false,
      type: 1,
      extra: {
        gfw: false,
        searchLimit: 10,
      }
    }
  }
  async getCategory() {
    return [
      { text: '首页', id: "/" },
      { text: '电影', id: "dianying" },
      { text: '电视剧', id: "dianshiju" },
      { text: '综艺', id: "zongyi" },
      { text: '动漫', id: "dongman" },
      { text: '短剧', id: "duanju" },
      { text: '电影解说', id: "dianyingjieshuo" },
      { text: '体育', id: "tiyu" },
    ]
  }
  async getHome() {
    const cate = env.get('category')
    const page = env.get('page')
    if (cate == "/") {
      const $ = kitty.load(await req(env.baseUrl))
      const banner = $(".dymrslide.banner").toArray().map(item => {
        const a = $(item).find("a")
        const id = a.attr("href") ?? ""
        const title = $(item).find(".dymr_title").text().trim() || (a.attr("title") ?? "")
        const cover = $(item).find("img").attr("src") ?? ""
        return <IMovie>{ id, title, cover, remark: "" }
      })
      const list = $(".homepage_main_tabs_wrap").toArray().map<IHomeContentItem | null>(item => {
        const titleEl = $(item).find(".homepage_main_tabs_title_new")
        if (!titleEl.length) return null
        const title = titleEl.text().trim()
        const videos = $(item).find(".homepage_video_wrap").toArray().map(item => {
          const a = $(item)
          const id = a.attr("href") ?? ""
          const title = a.attr("title") ?? ""
          const cover = $(item).find("img").attr("src") ?? ""
          return <IMovie>{ id, title, cover, remark: "" }
        })
        if (!videos.length) return null
        return <IHomeContentItem>{ type: "list", title, videos }
      }).filter(item => !!item)
      return <IHomeData>{
        type: "complex",
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
          ...list,
        ],
      }
    }
    const url = `${env.baseUrl}/vodshow/${cate}-----------.html`
    const $ = kitty.load(await req(url))
    return $(".homepage_video_wrap").toArray().map<IMovie>(item => {
      const a = $(item)
      const id = a.attr("href") ?? ""
      const title = a.attr("title") ?? ""
      const cover = $(item).find("img").attr("src") ?? ""
      return <IMovie>{ id, title, cover, remark: "", playlist: [] }
    })
  }
  async getDetail() {
    const id = env.get<string>("movieId")
    const url = `${env.baseUrl}${id}`
    const $ = kitty.load(await req(url))
    const desc = $(".content-desc").text().trim() || ($("meta[name='description']").attr("content") ?? "")
    const tabs = $(".play-source-tab a, .module-tab-item").toArray().map(item => {
      const name = $(item).attr("data-dropdown-value") ?? $(item).find("span").attr("data-dropdown-value") ?? undefined
      return name
    })
    const playlistTable = $(".module-player-list").toArray().map(item => {
      let id = $(item).attr("id") ?? ""
      id = id.replace("glist-", "")
      const list = $(item).find(".sort-item a").toArray().map(item => {
        const text = ($(item).text() ?? "").trim()
        const id = $(item).attr("href") ?? ""
        return <IPlaylistVideo>{ text, id }
      })
      return { id: +id, list }
    })
    const playlist = tabs.map((item, index) => {
      return <IPlaylist>{
        title: item,
        videos: playlistTable[index]?.list ?? []
      }
    })
    return <IMovie>{ desc, playlist }
  }
  async getSearch() {
    const wd = env.get("keyword")
    const page = env.get("page")
    const url = `${env.baseUrl}/vodsearch/${encodeURIComponent(wd ?? '')}----------${page}---.html`
    const $ = kitty.load(await req(url))
    return $(".homepage_video_wrap").toArray().map<IMovie>(item => {
      const a = $(item)
      const id = a.attr("href") ?? ""
      const title = a.attr("title") ?? ""
      const cover = $(item).find("img").attr("src") ?? ""
      return { id, title, cover, remark: "", desc: "", playlist: [] }
    })
  }
  async parseIframe() {
    return kitty.utils.getM3u8WithIframe(env)
  }
}

const env = createTestEnv("https://iuzvod.com")
const tv = new mxvod();
(async () => {
  const cates = await tv.getCategory()
  env.set("category", cates[0].id)
  env.set("page", 2)
  const home = await tv.getHome()
  env.set('keyword', '我能')
  const search = await tv.getSearch()
  env.set("movieId", search[0].id)
  const detail = await tv.getDetail()
  env.set("iframe", detail.playlist![0].videos[0].id)
  const realM3u8 = await tv.parseIframe()
  debugger
})()
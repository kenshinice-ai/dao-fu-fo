import { useMuseumContext } from "../context";

export function MethodologyPage() {
  const { locale } = useMuseumContext();
  return (
    <article className="page-shell methodology-page">
      <header className="page-intro">
        <p className="eyebrow">Method / 证据</p>
        <h1>{locale === "zh-CN" ? "如何阅读这座博物馆" : "How to read this museum"}</h1>
        <p>{locale === "zh-CN" ? "我们不裁判信仰真假，而是区分不同类型的陈述，并让重要内容回到原典、版本和来源。" : "The museum does not judge belief as true or false. It distinguishes kinds of claims and returns important content to texts, versions and sources."}</p>
      </header>
      <div className="method-grid">
        <section>
          <span>01</span>
          <h2>{locale === "zh-CN" ? "史料层" : "Historical evidence"}</h2>
          <p>{locale === "zh-CN" ? "文献、碑刻、考古、制度记录与可考年代。" : "Documents, inscriptions, archaeology, institutions and historically supportable dates."}</p>
        </section>
        <section>
          <span>02</span>
          <h2>{locale === "zh-CN" ? "传统层" : "Traditional accounts"}</h2>
          <p>{locale === "zh-CN" ? "经典、宗派和信众如何叙述祖师、神圣人物与宇宙。" : "How texts, lineages and communities narrate founders, sacred figures and the cosmos."}</p>
        </section>
        <section>
          <span>03</span>
          <h2>{locale === "zh-CN" ? "解释层" : "Interpretation"}</h2>
          <p>{locale === "zh-CN" ? "主要学术观点、概念翻译和仍然存在的争议。" : "Major scholarly interpretations, translation choices and continuing debates."}</p>
        </section>
      </div>
      <section className="method-rules">
        <h2>{locale === "zh-CN" ? "第一版承诺" : "First-release commitments"}</h2>
        <ul>
          <li>{locale === "zh-CN" ? "神圣地点不会获得伪经纬度。" : "Sacred places never receive false latitude and longitude."}</li>
          <li>{locale === "zh-CN" ? "原典摘录显示版本和定位。" : "Passages display their version and locator."}</li>
          <li>{locale === "zh-CN" ? "图片、声音与事实来源分开记录权利。" : "Media rights are recorded separately from factual sources."}</li>
          <li>{locale === "zh-CN" ? "三传统使用相同的最低内容门槛。" : "All three traditions use the same minimum content gates."}</li>
        </ul>
      </section>
    </article>
  );
}

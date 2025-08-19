import { useNavigate } from 'react-router-dom';

function formatDate(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

export default function PrivacyPolicy() {
  const nav = useNavigate();
  return (
    <div className="container mx-auto px-6 py-8 text-slate-800">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">CueMate 隐私政策</h1>
        <button
          onClick={() => nav(-1)}
          className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"
        >
          返回上一页
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 mb-6">
        更新日期：{formatDate()}
      </div>

      <div className="space-y-4 leading-relaxed">
        <p>
          <strong>感谢您选择 CueMate！</strong> 我们深知隐私与数据安全对您的重要性。本政策阐述我们在{' '}
          <strong>本地部署/私有部署优先</strong> 场景下如何收集、使用、存储与保护您的个人信息。
        </p>

        <h2 className="text-lg font-semibold mt-6">一、我们收集的信息</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>账户信息</strong>
            ：如用户名/邮箱等基本凭据，仅用于登录与账号管理，默认存储本地；我们不收集您的任何账户信息；
          </li>
          <li>
            <strong>运行数据（本地优先）</strong>
            ：为改进稳定性与体验，您可选择上报匿名崩溃日志与性能信息；默认不汇聚；
          </li>
          <li>
            <strong>输入/输出内容</strong>
            ：默认在本地处理与存储；如您自行启用第三方模型/语音等服务，相应数据将按第三方政策处理；
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">二、信息的使用</h2>
        <p>
          我们仅为实现产品功能、保障服务安全和改进体验而最小化使用信息；不会将您的个人信息用于与本服务无关的目的。
        </p>

        <h2 className="text-lg font-semibold mt-6">三、共享与第三方</h2>
        <p>
          我们不出售您的个人信息。若您启用第三方能力（如模型
          API、TTS/ASR、支付），相关数据由第三方按其政策处理；我们会尽力审慎选择并要求其合规。但请您在启用前自行评估并阅读第三方条款。
        </p>

        <h2 className="text-lg font-semibold mt-6">四、数据存储与安全</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>本地/私有部署优先</strong>：您的数据默认落在本机或自有环境；
          </li>
          <li>
            我们提供加密、访问控制、日志审计等能力；但鉴于客观限制，无法保证百分之百安全，您应做好备份与权限隔离；
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">五、您的权利</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>访问、更正与删除账户信息；</li>
          <li>撤回可选项（如匿名诊断、云端同步）并关闭第三方接入；</li>
          <li>在设置页发起账户注销，完成后我们将删除与账户相关的数据（法律法规另有规定除外）。</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">六、政策更新</h2>
        <p>
          我们可能适时更新本政策；重大变更将通过版本更新说明或页面提示告知。您继续使用即视为同意更新。
        </p>

        <p className="text-sm text-slate-600">
          联系邮箱：privacy@cuemate.app（用于隐私问题与数据请求）
        </p>
      </div>
    </div>
  );
}

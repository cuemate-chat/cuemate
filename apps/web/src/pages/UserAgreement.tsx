import { useNavigate } from 'react-router-dom';

function formatDate(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

export default function UserAgreement() {
  const nav = useNavigate();
  return (
    <div className="container mx-auto px-6 py-8 text-slate-800">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">CueMate 服务协议</h1>
        <button onClick={() => nav(-1)} className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50">返回上一页</button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 mb-6">
        更新日期：{formatDate()}
      </div>

      <div className="space-y-4 leading-relaxed">
        <p><strong>感谢您选择 CueMate！</strong> 本软件为本地部署/私有部署优先的面试辅助工具与内容创作工具（以下简称“本服务”）。本协议由您与 CueMate 团队（以下简称“我们”）订立并约束您对本服务的使用。</p>

        <p>使用或安装本软件即代表您已阅读、理解并同意受本协议全部条款的约束。如您不同意，请立即卸载并停止使用本服务。</p>

        <h2 className="text-lg font-semibold mt-6">一、服务定位与使用方式</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>本软件主要以 <strong>本地运行/用户自有环境部署</strong> 为主，非典型 SaaS；您对运行环境、系统权限与数据权限拥有完全控制；</li>
          <li>本服务可能集成第三方 AI 模型、语音/文本服务，您应遵守第三方的协议与政策；</li>
          <li>我们可能持续迭代并发布更新版本或可选的增值能力；</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">二、账户与安全</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>您应确保注册/登录信息真实、准确并及时更新；</li>
          <li>账户仅供本人使用，因共享、转让、泄露导致的风险与损失由您自行承担；</li>
          <li>如发现异常使用，应立即采取措施（如更改密码、断网、卸载等）并及时联系我们；</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">三、合规与内容</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>您承诺遵守法律法规及公序良俗，不输入或生成违法、侵权、低俗等内容；</li>
          <li>您对自己输入的内容与使用输出结果承担全部责任；我们对生成内容的准确性、完整性与适用性<strong>不作任何保证</strong>；</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">四、数据与隐私（本地优先）</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>本软件以本地/私有部署为主，数据在您的设备或自有环境内处理与存储</strong>；除您明确选择的云端同步/第三方服务外，我们不主动汇聚您的数据；</li>
          <li>若您启用第三方服务（模型、语音、支付等），相应数据将按第三方条款处理；</li>
          <li>更多细则见《隐私政策》；</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">五、免责声明与责任限制</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>本软件“按现状”提供</strong>，我们不对其适销性、特定用途适用性、不中断或无错误等做任何明示或暗示担保；</li>
          <li>在法律允许的最大范围内，因使用或无法使用本服务造成的任何直接或间接损失（包括但不限于数据丢失、业务中断、利润损失、合规风险），<strong>均由您自行承担</strong>；</li>
          <li>如需商业或专业用途，请在生产环境部署前充分评估并自建配套的备份、审计与安全方案；</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">六、协议变更与通知</h2>
        <p>为更好地提供服务，我们可能更新本协议；新版将通过站内页面展示或版本更新说明告知。您继续使用即视为接受变更。</p>

        <h2 className="text-lg font-semibold mt-6">七、法律适用与争议解决</h2>
        <p>本协议受中华人民共和国法律管辖。因本协议产生的争议，由本服务运营地有管辖权的人民法院诉讼解决。</p>

        <p className="text-sm text-slate-600">联系邮箱：support@cuemate.app（用于反馈与沟通）</p>
      </div>
    </div>
  );
}



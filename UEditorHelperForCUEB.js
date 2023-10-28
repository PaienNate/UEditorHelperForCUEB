// ==UserScript==
// @name         去TMD网络断联一天白干
// @namespace    Violentmonkey Scripts
// @version      1.3
// @description  一些针对某些不人性化的UEditorPlus的合规操作。具体自己看，懒狗不爱写说明。
// @author       Pinenutn
// @match        http://ncms.cueb.edu.cn/cms/*
// @match        https://open-demo.modstart.com/ueditor-plus/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";
  //默认启动自动存储
  let isAutoSaveEnabled = false;
  //剩余时间
  let remainingSeconds = 0;
  // 最大保存版本数
  const maxAutoSaveVersions = 5;
  const maxManualSaveVersions = 3;
  let zIndexCounter = 1; // 用于管理 z-index 值的计数器

  // 自动保存定时器，默认每5秒保存一次
  let autoSaveInterval;
  const autoSaveIntervalTime = 5000 * 60; // 5分钟

  // 版本列表，最多保存五个自动保存版本和三个手动保存版本
  let autoSaveVersionList = [];
  let manualSaveVersionList = [];

  const runButton = document.createElement("button")
  runButton.textContent = "开/关 辅助面板"
  runButton.style.position = "fixed";
  runButton.style.top = "20px";
  runButton.style.left = "20px";



  // 创建按钮包含组
  const buttonContainer = document.createElement("div");
  buttonContainer.style.position = "fixed";
  buttonContainer.style.top = "40px";
  buttonContainer.setAttribute("id", "buttonC");
  buttonContainer.style.left = "20px";
  buttonContainer.style.width = "200px";
  buttonContainer.style.height = "300px";
  buttonContainer.style.visibility = "hidden";
  //创建……嗯……版权信息？
  const Who = document.createElement("h2");
  Who.textContent = "By Pinenutn and Chary.";
  Who.style.whiteSpace = "pre-line"
  const information = document.createElement("p");
  information.textContent = "Ver1.3: 由Chary修正了独图段落合并会吞图的严重恶性BUG。 Ver1.2:增加独图段落合并功能。使用场景大概是：你上传了好几张图片，然后想把他们放在一段里的时候。会自动用空格分割。\nVer1.1:增加图片一键规整的功能，会将图片转换成指定大小并居中。显示上可能不太一样，但预览是一样的。\nVer1.0:手动实现自动保存功能。由于样式什么的都是Chat出来的，所以在小屏幕上兼容估计不会太棒。";
  information.style.whiteSpace="pre-line";

  //添加来源于Sakura.css的属性
  const mystyle =
    " #buttonC > button{  display: inline-block;  padding: 5px 10px;  text-align: center;  text-decoration: none;  white-space: nowrap;  background-color: #1d7484;  color: #f9f9f9;  border-radius: 1px;border: 1px solid #1d7484;cursor: pointer;box-sizing: border-box;}";
  const mystyle2 = "#buttonC > textarea, select, input {  color: #4a4a4a;  padding: 6px 10px;  margin-bottom: 10px;  background-color: #f1f1f1;  border: 1px solid #f1f1f1;  border-radius: 4px;  box-shadow: none;  box-sizing: border-box;}"

  GM_addStyle(mystyle);
  GM_addStyle(mystyle2);
  document.body.appendChild(runButton);


  // 创建下载代码的按钮
  const downloadButton = document.createElement("button");
  downloadButton.textContent = "下载当前代码";


  // 创建自动保存按钮
  const autoSaveButton = document.createElement("button");
  autoSaveButton.textContent = "开启自动保存";

  // 创建手动保存按钮
  const manualSaveButton = document.createElement("button");
  manualSaveButton.textContent = "手动进行保存";

  // 创建加载保存按钮
  const loadButton = document.createElement("button");
  loadButton.textContent = "加载已有保存";


  // 添加一个按钮到页面
  const button = document.createElement('button');
  button.textContent = '图片一键规整';

  // 添加两个文本框以及它们的提示
  const mergeCheckbox = document.createElement('input');
  mergeCheckbox.type = 'checkbox';
  mergeCheckbox.id = 'mergeCheckbox';

  const noticeforwidth = document.createElement("span")
  noticeforwidth.textContent = "新宽度(单位px)"
  const widthInput = document.createElement('input');
  widthInput.placeholder = '新宽度';
  widthInput.value = '300'; // 设置默认值
  const noticeforheight = document.createElement("span")
  noticeforheight.textContent = "新高度(单位px)"

  const noticeformerge = document.createElement("span")
  noticeformerge.textContent = "规整时合并独图段落（实验性，记得保存）"

  const heightInput = document.createElement('input');
  heightInput.placeholder = '新高度';
  heightInput.value = '200'; // 设置默认值
  //添加关于按钮
  const aboutButton = document.createElement("button");
  aboutButton.textContent = "查看使用说明"










  /*监听添加开始*/
aboutButton.addEventListener('click',()=>{
  alert("说明：请注意，文件存在缓存里，如果你刚需保存，就不要闲的没事清理什么浏览器垃圾。\n 手动进行保存：\n即点击后保存一次。最多有三个暂存。\n 自动进行保存：\n点击后，每300秒保存一次。注意，第一次点击它是开启该功能，此时不保存。最多保存五个暂存，超过五个将会顶掉之前的（也就是说300秒后才会第一次保存。）\n加载已有保存：\n不解释，自己点点看。\n下载当前代码：\n适合要搬运到其他场合的地方。比如换电脑。或者可以用于稳定的暂存（某些保存并关闭真是人性化捏）\n修改图片尺寸：\n该功能将会修改图片大小为下方设置的大小(单位px)，并自动将图片居中，解决了调整图片的痛点。")
})

// 图片批量转换处理
button.addEventListener('click', () => {
  //获取当前HTML字符串并解析为DOM对象
  const parser = new DOMParser();
  const htmlString = UE.getEditor("editor").getContent(); // 在这里放置HTML字符串
  let doc = parser.parseFromString(htmlString, 'text/html');
  // 获取用户输入的宽度和高度
  const newWidth = widthInput.value;
  const newHeight = heightInput.value;

  // 如果用户点击取消或没有输入值，则不执行操作
  if (newWidth === null || newHeight === null || newWidth === '' || newHeight === '') {
    showNotification('操作已取消或未输入有效值。');
    return;
  }

  // 查找所有带有img类的img元素
  const imgElements = doc.querySelectorAll('img');
  console.log(imgElements)

  // 修改宽度和高度
  imgElements.forEach(img => {
    img.setAttribute('width', newWidth + "px");
    img.setAttribute('height', newHeight + "px");
    img.style.height = newHeight + "px"
    img.style.width = newWidth + "px"
  });

  // 设置父节点的class属性为gpCmsImg
  imgElements.forEach(img => {
    const parent = img.parentNode;
    if (parent.innerText === ""&&parent.localName==="p"){
        parent.classList.add('gpCmsImg');
    }
  });
  //如果要合并段落就合并
  console.log(mergeCheckbox.value)
  if(mergeCheckbox.checked){
    doc = mergeAdjacentImageParagraphs(doc);
    console.log(doc)
  }


  // 找到所有class属性为gpCmsImg且是<p>标签的父节点，并设置文本居中样式
  const gpCmsImgParents = doc.querySelectorAll('p.gpCmsImg');

  gpCmsImgParents.forEach(p => {
    p.style.textAlign = 'center';
  });

  const modifiedHTMLString = new XMLSerializer().serializeToString(doc);
  UE.getEditor("editor").setContent(modifiedHTMLString);

  // 弹出成功提示
  showNotification('操作成功！');
});


  //转换处理
    runButton.addEventListener("click",()=>{
      console.log(buttonContainer.style.visibility)
      let ifhidden = buttonContainer.style.visibility == "hidden";
      if(ifhidden){
        buttonContainer.style.visibility = "visible";
      }
      else{
        buttonContainer.style.visibility = "hidden";
      }
  })

  //下载处理
  downloadButton.addEventListener("click", () => {
    // 获取UEditor内容
    const ueditorContent = UE.getEditor("editor").getContent();

    // 创建Blob对象以保存内容
    const blob = new Blob([ueditorContent], { type: "text/plain" });

    // 创建下载链接
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    var currentDate = new Date();
    var year = currentDate.getFullYear();
    var month = currentDate.getMonth() + 1; // 月份是从0开始的，所以要加1
    var date = currentDate.getDate();
    a.download = "ueditor-" + year + "-" + month + "-" + date + ".txt"; // 设置下载文件名
    a.style.display = "none";
    document.body.appendChild(a);

    // 触发点击下载链接
    a.click();

    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

  // 手动保存
  manualSaveButton.addEventListener("click", () => {
    // 手动保存UEditor内容
    const ueditorContent = UE.getEditor("editor").getContent();

    // 为保存的手动版本生成时间戳
    const timestamp = Date.now();

    // 保存手动版本
    saveManualVersion(ueditorContent, timestamp);

    showNotification("内容已手动保存！");
  });

  //监听添加结束


/*注册处理*/
  buttonContainer.appendChild(Who);
  buttonContainer.appendChild(manualSaveButton);
  buttonContainer.appendChild(autoSaveButton);
  buttonContainer.appendChild(loadButton);
  buttonContainer.appendChild(downloadButton);
  buttonContainer.appendChild(button);
  buttonContainer.appendChild(aboutButton);
  buttonContainer.appendChild(document.createElement("br"));
  buttonContainer.appendChild(noticeforwidth);
  buttonContainer.appendChild(widthInput);
  buttonContainer.appendChild(document.createElement("br"));
  buttonContainer.appendChild(noticeforheight);
  buttonContainer.appendChild(heightInput);
  buttonContainer.appendChild(document.createElement("br"));
  buttonContainer.appendChild(mergeCheckbox);
  buttonContainer.appendChild(noticeformerge);
  buttonContainer.appendChild(information);

  document.body.appendChild(buttonContainer);

/*注册结束*/
function mergeAdjacentImageParagraphs(doc) {
  const paragraphs = doc.querySelectorAll('p.gpCmsImg');
  let currentMergedParagraph = null;
  const arr = []
  paragraphs.forEach(p => {
    if (p.nextElementSibling.classList.contains('gpCmsImg')) {
        arr.push(p)
    }else {
       const fragment = document.createDocumentFragment();
       arr.forEach(e=> {
           e.querySelectorAll('img').forEach(img=>img&&fragment.append(img))
           e.remove()
       })
       p.querySelectorAll('img').forEach(img=>img&&fragment.append(img))
       p.innerHTML = ""
       p.append(fragment)
    }
  });

  return doc;
}


  function getLocalSaveData() {
    let autosave = "未获取到";
    let manualsave = "未获取到";
    if (localStorage.getItem("autoSaveVersionList")) {
      autoSaveVersionList = JSON.parse(
        localStorage.getItem("autoSaveVersionList")
      );
      autosave = "读取成功";
    }
    if (localStorage.getItem("manualSaveVersionList")) {
      manualSaveVersionList = JSON.parse(
        localStorage.getItem("manualSaveVersionList")
      );
      manualsave = "读取成功";
    }
    showNotification(
      '自动保存：' + autosave + "  手动保存：" + manualsave
    );
  }

  getLocalSaveData();

  //显示剩余时间
  function updateAutoSaveButtonText() {
    autoSaveButton.textContent = `${remainingSeconds}秒后保存`;
  }
  // 启动自动保存定时器
  function startAutoSave() {
    clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
      autoSave();
    }, autoSaveIntervalTime);
    remainingSeconds = autoSaveIntervalTime / 1000;
    updateAutoSaveButtonText();
    isAutoSaveEnabled = true;
    showNotification(
      `已启动自动保存，每${autoSaveIntervalTime / 1000}秒保存一次`
    );
    // 添加定时器，每秒更新剩余时间
    const countdownTimer = setInterval(() => {
      remainingSeconds -= 1;
      updateAutoSaveButtonText(); // 更新按钮文字
      if (remainingSeconds <= 0) {
        console.log(isAutoSaveEnabled);
        if (!isAutoSaveEnabled) {
          clearInterval(countdownTimer);
        } else {
          remainingSeconds = autoSaveIntervalTime / 1000;
        }
      }
    }, 1000);
  }

  // 停止自动保存定时器
  function stopAutoSave() {
    clearInterval(autoSaveInterval);
    showNotification("已停止自动保存");
    autoSaveButton.textContent = "启动自动保存";
    isAutoSaveEnabled = false;
  }

  // 添加自动保存按钮点击事件处理程序
  autoSaveButton.addEventListener("click", () => {
    if (isAutoSaveEnabled) {
      stopAutoSave();
    } else {
      startAutoSave();
    }
  });

  // 添加读取按钮点击事件处理程序
  loadButton.addEventListener("click", () => {
    // 显示选择加载自动保存还是手动保存的版本
    showLoadOptions();
  });

  // 显示选择加载自动保存还是手动保存的版本
  function showLoadOptions() {
    const loadDiv = document.createElement("div");
    loadDiv.style.position = "fixed";
    loadDiv.style.top = "300px";
    loadDiv.style.left = "20px";
    loadDiv.style.backgroundColor = "#FFFFFF"; // 白色背景
    loadDiv.style.border = "1px solid #000000"; // 黑色边框
    loadDiv.style.borderRadius = "5px"; // 圆角边框
    loadDiv.style.padding = "10px";
    loadDiv.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)"; // 阴影效果
    loadDiv.style.zIndex = "9999";

    const autoSaveButton = document.createElement("button");
    autoSaveButton.textContent = "加载自动保存版本";
    autoSaveButton.style.width = "100%";
    autoSaveButton.style.backgroundColor = "#007BFF"; // 蓝色背景
    autoSaveButton.style.color = "#FFFFFF"; // 白色文本
    autoSaveButton.style.border = "none";
    autoSaveButton.style.padding = "5px 10px";
    autoSaveButton.style.marginTop = "10px";
    autoSaveButton.style.cursor = "pointer";

    autoSaveButton.addEventListener("click", () => {
      // 显示保存的自动保存版本列表供用户选择
      showAutoSaveVersionList();
      document.body.removeChild(loadDiv);
    });

    const manualSaveButton = document.createElement("button");
    manualSaveButton.textContent = "加载手动保存版本";
    manualSaveButton.style.width = "100%";
    manualSaveButton.style.backgroundColor = "#DC3545"; // 红色背景
    manualSaveButton.style.color = "#FFFFFF"; // 白色文本
    manualSaveButton.style.border = "none";
    manualSaveButton.style.padding = "5px 10px";
    manualSaveButton.style.marginTop = "10px";
    manualSaveButton.style.cursor = "pointer";

    manualSaveButton.addEventListener("click", () => {
      // 显示保存的手动保存版本列表供用户选择
      showManualSaveVersionList();
      document.body.removeChild(loadDiv);
    });

    loadDiv.appendChild(autoSaveButton);
    loadDiv.appendChild(manualSaveButton);
    document.body.appendChild(loadDiv);
  }

  // 保存新自动保存版本到版本列表
  function saveAutoSaveVersion(content, timestamp) {
    if (autoSaveVersionList.length >= maxAutoSaveVersions) {
      // 如果自动保存版本列表已满，删除最旧的版本
      autoSaveVersionList.shift();
    }
    // 添加新自动保存版本到版本列表
    autoSaveVersionList.push({ content, timestamp });
    // 按时间戳排序
    autoSaveVersionList.sort((a, b) => b.timestamp - a.timestamp);
    //将其存放在localStorage内
    localStorage.setItem(
      "autoSaveVersionList",
      JSON.stringify(autoSaveVersionList)
    );
  }

  // 保存新手动保存版本到版本列表
  function saveManualVersion(content, timestamp) {
    if (manualSaveVersionList.length >= maxManualSaveVersions) {
      // 如果手动保存版本列表已满，删除最旧的版本
      manualSaveVersionList.shift();
    }
    // 添加新手动保存版本到版本列表
    manualSaveVersionList.push({ content, timestamp });
    // 按时间戳排序
    manualSaveVersionList.sort((a, b) => b.timestamp - a.timestamp);
    //将其存放在localStorage内
    localStorage.setItem(
      "manualSaveVersionList",
      JSON.stringify(manualSaveVersionList)
    );
  }

  // 创建通知函数
  function showNotification(message) {
    console.log(message);
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.bottom = "20px"; // 将通知显示在底部
    notification.style.left = "20px"; // 将通知显示在左侧
    notification.style.padding = "10px";
    notification.style.backgroundColor = "#00FF00"; // 绿色背景
    notification.style.zIndex = zIndexCounter++;

    document.body.appendChild(notification);

    // 2秒后自动隐藏通知
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 2000);
  }

  // 显示保存的自动保存版本列表供用户选择
  function showAutoSaveVersionList() {
    if (autoSaveVersionList.length === 0) {
      showNotification("没有自动保存的版本！");
      return;
    }

    const versionDiv = document.createElement("div");
    versionDiv.style.position = "fixed";
    versionDiv.style.top = "300px";
    versionDiv.style.left = "20px";
    versionDiv.style.backgroundColor = "#FFFFFF"; // 白色背景
    versionDiv.style.border = "1px solid #000000"; // 黑色边框
    versionDiv.style.borderRadius = "5px"; // 圆角边框
    versionDiv.style.padding = "10px";
    versionDiv.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)"; // 阴影效果
    versionDiv.style.zIndex = "9999";

    const select = document.createElement("select");
    select.style.marginBottom = "10px";
    select.style.width = "100%";

    for (let i = 0; i < autoSaveVersionList.length; i++) {
      const option = document.createElement("option");
      option.value = i;
      const timestamp = new Date(
        autoSaveVersionList[i].timestamp
      ).toLocaleString();
      option.textContent = `自动保存版本 ${i + 1} (${timestamp})`;
      select.appendChild(option);
    }

    const loadButton = document.createElement("button");
    loadButton.textContent = "加载选定版本";
    loadButton.style.width = "100%";
    loadButton.style.backgroundColor = "#007BFF"; // 蓝色背景
    loadButton.style.color = "#FFFFFF"; // 白色文本
    loadButton.style.border = "none";
    loadButton.style.padding = "5px 10px";
    loadButton.style.marginTop = "10px";
    loadButton.style.cursor = "pointer";

    loadButton.addEventListener("click", () => {
      const selectedIndex = select.value;
      if (selectedIndex !== null) {
        // 加载选定的自动保存版本到UEditor
        UE.getEditor("editor").setContent(
          autoSaveVersionList[selectedIndex].content
        );
        showNotification(`已加载选定自动保存版本 ${selectedIndex + 1}`);
        document.body.removeChild(versionDiv);
      }
    });

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "取消";
    cancelButton.style.width = "100%";
    cancelButton.style.backgroundColor = "#DC3545"; // 红色背景
    cancelButton.style.color = "#FFFFFF"; // 白色文本
    cancelButton.style.border = "none";
    cancelButton.style.padding = "5px 10px";
    cancelButton.style.marginTop = "5px";
    cancelButton.style.cursor = "pointer";

    cancelButton.addEventListener("click", () => {
      document.body.removeChild(versionDiv);
    });

    versionDiv.appendChild(select);
    versionDiv.appendChild(loadButton);
    versionDiv.appendChild(cancelButton);
    document.body.appendChild(versionDiv);
  }

  // 自动保存函数
  function autoSave() {
    // 获取当前UEditor的内容
    const ueditorContent = UE.getEditor("editor").getContent();
    // 为自动保存版本生成时间戳
    const timestamp = Date.now();
    // 保存自动保存版本
    saveAutoSaveVersion(ueditorContent, timestamp);
    showNotification("自动保存已完成！");
  }

  // 显示保存的手动保存版本列表供用户选择
  function showManualSaveVersionList() {
    if (manualSaveVersionList.length === 0) {
      showNotification("没有手动保存的版本！");
      return;
    }

    const versionDiv = document.createElement("div");
    versionDiv.style.position = "fixed";
    versionDiv.style.top = "300px";
    versionDiv.style.left = "20px";
    versionDiv.style.backgroundColor = "#FFFFFF"; // 白色背景
    versionDiv.style.border = "1px solid #000000"; // 黑色边框
    versionDiv.style.borderRadius = "5px"; // 圆角边框
    versionDiv.style.padding = "10px";
    versionDiv.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.5)"; // 阴影效果
    versionDiv.style.zIndex = "9999";

    const select = document.createElement("select");
    select.style.marginBottom = "10px";
    select.style.width = "100%";

    for (let i = 0; i < manualSaveVersionList.length; i++) {
      const option = document.createElement("option");
      option.value = i;
      const timestamp = new Date(
        manualSaveVersionList[i].timestamp
      ).toLocaleString();
      option.textContent = `手动保存版本 ${i + 1} (${timestamp})`;
      select.appendChild(option);
    }

    const loadButton = document.createElement("button");
    loadButton.textContent = "加载选定版本";
    loadButton.style.width = "100%";
    loadButton.style.backgroundColor = "#007BFF"; // 蓝色背景
    loadButton.style.color = "#FFFFFF"; // 白色文本
    loadButton.style.border = "none";
    loadButton.style.padding = "5px 10px";
    loadButton.style.marginTop = "10px";
    loadButton.style.cursor = "pointer";

    loadButton.addEventListener("click", () => {
      const selectedIndex = select.value;
      if (selectedIndex !== null) {
        // 加载选定的手动保存版本到UEditor
        UE.getEditor("editor").setContent(
          manualSaveVersionList[selectedIndex].content
        );
        showNotification(`已加载选定手动保存版本 ${selectedIndex + 1}`);
        document.body.removeChild(versionDiv);
      }
    });

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "取消";
    cancelButton.style.width = "100%";
    cancelButton.style.backgroundColor = "#DC3545"; // 红色背景
    cancelButton.style.color = "#FFFFFF"; // 白色文本
    cancelButton.style.border = "none";
    cancelButton.style.padding = "5px 10px";
    cancelButton.style.marginTop = "5px";
    cancelButton.style.cursor = "pointer";

    cancelButton.addEventListener("click", () => {
      document.body.removeChild(versionDiv);
    });

    versionDiv.appendChild(select);
    versionDiv.appendChild(loadButton);
    versionDiv.appendChild(cancelButton);
    document.body.appendChild(versionDiv);
  }
})();

var prism = {};

prism.getParamFromUrl = function (param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

prism.paramInUrl = function (param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has(param);
};

prism.progressBar = function (objName, totalTime, callBackFinish) {
  let progressbar = document.getElementById(objName);
  const valor = progressbar.value;
  if (valor == 100) callBackFinish();
  else {
    progressbar.value = valor + 1;
    setTimeout(
      progressBar,
      totalTime / 100,
      objName,
      totalTime,
      callBackFinish
    );
  }
};

prism.onChangeFileImage = function(file,image){
	const fileElement = document.getElementById(file);
	const imageElement = document.getElementById(image);
	const [selectedFile] = fileElement.files;
  if (selectedFile)
  {
    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedFile);
    reader.onloadend = function() {
      const imgBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(reader.result)));
      imageElement.src = `data:image/png;base64, ${imgBase64}`;
    };
  }
}

prism.getImageValueInBase64 = function(image)
{
  const imageElement = document.getElementById(image);
  const pos = imageElement.src.indexOf('base64');
  if (pos>-1)
    return imageElement.src.substr(pos+8);
  else
    return '';
}

prism.RestApi = function (baseUrl) {
  this.baseUrl = baseUrl;
  this.request = function (method, url, body, success, error) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      try {
        if (this.readyState == 4) {
          if (this.status == 200){
            resp = JSON.parse(xhttp.response);
            if (!resp) resp = xhttp.response;
            success(resp);
          }
          else error(xhttp.response, this.status);
        }
      } catch (err) {
        error(err.message, 0);
      }
    };
    xhttp.open(method, this.baseUrl + url, true);
    let jwtoken = localStorage.getItem("autentication");
    if (jwtoken) {
      try {
        jwtoken = JSON.parse(jwtoken);
        if (jwtoken && jwtoken.access_token)
          xhttp.setRequestHeader(
            "Authorization",
            "Bearer " + jwtoken.access_token
          );
      } catch (err) {}
    }
    xhttp.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
    // fallbacks for IE and older browsers:
    /*xhttp.setRequestHeader("Expires", "Tue, 01 Jan 1980 1:00:00 GMT");
    xhttp.setRequestHeader("Pragma", "no-cache");*/
    xhttp.setRequestHeader("Content-type", "application/json");
    try {
      if (!body) xhttp.send();
      else xhttp.send(JSON.stringify(body));
    } catch (err) {
      error(err.message, 0);
    }
  };
  function errorCallback(data, status) {
    console.error(data);
    if (data.message) alert(data.message);
    else alert(data);
  }
  prism.RestApi.prototype.httpPost = function (url, body, successCallback) {
    this.request("POST", url, body, successCallback, errorCallback);
  };
  prism.RestApi.prototype.httpPut = function (url, body, successCallback) {
    this.request("PUT", url, body, successCallback, errorCallback);
  };
  prism.RestApi.prototype.httpGet = function (url, successCallback) {
    this.request("GET", url, null, successCallback, errorCallback);
  };
  prism.RestApi.prototype.httpDelete = function (url, successCallback) {
    this.request("DELETE", url, null, successCallback, errorCallback);
  };
};

prism.Table = function (table, columns, operations) {
  this.tbl = table;
  this.cols = columns;
  this.operations = operations;
  this.tbody = null;
  this.filterContent = null;
  this.orderby = null;
  this.values = [];
  this.lastIndexColSort = -1;
  this.lastDirectionSort = false;
  prism.Table.prototype.init = function () {
    this.tbl.deleteTHead();
    const header = this.tbl.createTHead();
    const row = header.insertRow();
    let index = 0;
    const self = this;
    for (const col of this.cols) {
      col.Field = col.Field.toLowerCase();
      const cell = row.insertCell();
      cell.innerHTML = col.Label;
      col.index = index;
      cell.onclick = function () {
        if (self.lastIndexColSort != col.index) {
          self.lastDirectionSort = true;
          self.lastIndexColSort = col.index;
        } else if (self.lastDirectionSort)
          self.lastDirectionSort = !self.lastDirectionSort;
        else if (!self.lastDirectionSort) self.lastIndexColSort = -1;
        self.sortByColumnIndex(self.lastIndexColSort, self.lastDirectionSort);
      };
      index++;
    }
    for (const col of operations) {
      const cell = row.insertCell();
      cell.innerHTML = "";
    }
    this.tbody = this.tbl.createTBody();
  };
  prism.Table.prototype.clearRows = function () {
    for (let index = this.values.length; index > 0; index--)
      this.tbl.deleteRow(index);
    this.values = [];
  };
  prism.Table.prototype.setRows = function (lstObj) {
    this.clearRows();
    for (const obj of lstObj) this.addRow(obj);
    if (this.lastIndexColSort >= 0)
      this.sortByColumnIndex(this.lastIndexColSort, this.lastDirectionSort);
  };
  function adjustColumnName(col, obj) {
    if (col.Field in obj) return;
    for (colName in obj)
      if (col.Field.toLowerCase() == colName.toLowerCase()) {
        col.Field = colName;
        return;
      }
  }
  prism.Table.prototype.addRow = function (obj) {
    const row = this.tbody.insertRow();
    row.obj = obj;
    this.values.push(obj);
    for (const col of this.cols) {
      const cell = row.insertCell();
      adjustColumnName(col, obj);
      cell.innerHTML = obj[col.Field];
    }
    for (const col of this.operations) {
      const cell = row.insertCell();
      const btn = document.createElement("button");
      const btnClass = "tool-btn " + col.Class;
      for (const x of btnClass.split(" ")) btn.classList.add(x);
      //btn.innerHTML = col.Label;
      btn.title = col.Label;
      btn.onclick = function () {
        col.Action(row.obj);
      };
      cell.appendChild(btn);
    }
    row.style = this.passFilter(row.obj)
      ? "display:;"
      : "display:none;";
  };
  this.passFilter = function (obj) {
    if (!this.filterContent) return true;
    for (col of this.cols)
      if (obj[col.Field].toString().toLowerCase().includes(this.filterContent))
        return true;
    return false;
  };
  prism.Table.prototype.filter = function (filterContent) {
    this.filterContent = filterContent.toLowerCase();
    for (let row of this.tbody.children)
      row.style = this.passFilter(row.obj)
        ? "display:;"
        : "display:none;";
  };
  function sortByKeyAsc(array, key) {
    return array.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }
  function sortByKeyDes(array, key) {
    return array.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      return x < y ? 1 : x > y ? -1 : 0;
    });
  }
  prism.Table.prototype.sortByColumnIndex = function (indexCol, asc) {
    this.lastIndexColSort = indexCol;
    this.lastDirectionSort = asc;
    const values =
      indexCol < 0
        ? this.values
        : asc
        ? sortByKeyAsc(this.values, this.cols[indexCol].Field)
        : sortByKeyDes(this.values, this.cols[indexCol].Field);
    for (let index = values.length; index > 0; index--)
      this.tbl.deleteRow(index);
    this.values = [];
    for (const obj of values) this.addRow(obj);
  };
};

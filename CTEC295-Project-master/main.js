//environment variables used by Google API
var CLIENT_ID = '';
var API_KEY = '';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
var SCOPES = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/drive';

//My environment variables
var Window = "";
var currentFile = "";
var canvas = "";
var stylus = "";
var mouseDown = false;
var LoginCredentials;
var Pencil = {
  name: "Pencil",
  shape: 0, //circle
  size: 4,
  color: "#485353",
};
var Pen = {
  name: "Pen",
  shape: 1,//square
  size: 4,
  color: "#000000",
};
var Marker = {
  name: "Marker",
  shape: 2, //marker
  size: 10,
  color: "#000000",
};
var ActualShape = {
  id: 0,
  size: 30,
  color:"#000000",
};
var stylusIsShape = false;
var PrebuiltStylusSettings = [Pencil,Pen,Marker];
var stylusSettings = PrebuiltStylusSettings[0];
var CanvasSnapshots = [];
var acceptedImageTypes = ["image/jpeg","image/jpg","image/gif","image/png"];
var metadata = {
  type: "image/png",
  name: "Draw.NETUpload"
};
var undoLayer = 0;
var drawingStatus = 0; //0= not drawing, 1 = drawing, 2= drawing has completed
var isDrawing = 0;
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
     LoginCredentials = gapi.auth2.getAuthInstance();
     googleUserAccount = LoginCredentials.currentUser.get();
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  }, function(error) {
    console.log(JSON.stringify(error, null, 2));
  });
}
function updateSigninStatus(isSignedIn) {}
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
  Window.document.getElementById("signOutDrive").hidden = false;
  Window.document.getElementById("signInDrive").hidden = true;
}
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
  Window.getElementById("signOutDrive").hidden = true;
  Window.getElementById("signInDrive").hidden = false;
};
//INIT FUNCTION
function WebPageContentSetup(value){
  Window = value;
  canvas = Window.document.getElementById("drawingCanvas");
  stylus = canvas.getContext("2d");
  canvas.width = Window.innerWidth*0.8;
  canvas.height = Window.innerHeight*0.8;
  //wipeCanvas();

  //Event Listeners for webpage
  Window.addEventListener("resize",function(e){handleCanvasResize(e);});//resizeCanvas(e);
  Window.document.getElementById('PenColor').addEventListener('change', function(e){
    setStylusColor(document.getElementById('PenColor').value);
	}, false);
  Window.document.getElementById('stylusWidth').addEventListener('change', function(e){
    setStylusSize(document.getElementById('stylusWidth').value);
	}, false);
  Window.document.getElementById("drawingCanvas").addEventListener("mousemove", function(e){handleMouseMovement(e);});
  Window.document.getElementById("drawingCanvas").addEventListener("mousedown",function(e){isDrawing = 1;});
  Window.document.getElementById("drawingCanvas").addEventListener("mouseup",function(e){isDrawing = 0;});
  var fileSelect = Window.document.getElementById("fileInput").addEventListener("change", event => {
      var file = event.target.files[0];
      var reader = new FileReader();
      reader.readAsDataURL(file);
      if(checkFileType(file.type)) loadImageOntoCanvas(file);
      else console.error("fileType "+file.type+" not accepted, import aborted.");
  });
  buildStylusPrebuilts();
  //console.log("Webpage setup completed");
};
function buildStylusPrebuilts(){
  stylusUL = Window.document.getElementById("prebuiltstylus");
  for(i=0; i<PrebuiltStylusSettings.length; i++){
    let k = i;
    var link = Window.document.createElement('a');
    link.href = "#";
    link.addEventListener("click",function(){setStylus(k);});
    link.innerHTML = PrebuiltStylusSettings[i].name;
    var stylusLI = Window.document.createElement("li");
    stylusLI.appendChild(link);
    stylusUL.appendChild(stylusLI);
  }
};
//ALL JS METHODS RELATING TO FILE/API INTERACTION
function setupPCSave(){
  Window.document.getElementById("pcsave").href = canvas.toDataURL("image/png");
};
function setupDriveSave(fileType){
  Window.document.getElementById("saveWindow").style.display = "none";
  var fileName = Window.document.getElementById("fileName").value
  console.log(fileName);
  setFileName(fileName);
  setFileType(fileType);
  driveMultipartUpload();
};
function driveBasicUpload(){
  var url = new URL("https://www.googleapis.com/upload/drive/v3/files");
  url.searchParams.append("uploadType","media");
  getCanvasData().then(function(data){
    var file = new File([data],metadata.name,{type:metadata.type});
    var request = new Request(url, {
      method: "POST",
      headers: {'Content-Type':metadata.type, 'Content-Length':file.size,
      'Authorization':"Bearer "+googleUserAccount.xc.access_token},
      body: file,
    });
    fetchRequest(request).then(function(e){console.log(e);});
  });
};
function driveMultipartUpload(){
  var form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  var url = new URL('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,kind');

  getCanvasData().then(function(data){
    var file = new File([data],metadata.name,{type:metadata.type});
    form.append('file', file);
      var request = new Request(url, {
        method: 'POST',
        headers: new Headers({'Authorization': 'Bearer ' + googleUserAccount.xc.access_token}),
        body: form
      });
      fetchRequest(request);
  });
};
async function fetchRequest(request){
  let response = await fetch(request);
  if(response.status >=200 && response.status < 300) {return response;}
  else {return Promise.reject(new Error(response.statusText));}
};
function setFileType(value){
  if(checkFileType(value))
    metadata.type = value;
  else {
    console.error("desired file type is either unsupported or nonexistent, defaulting to image/png");
    metadata.type = "image/png";
  }
};
function setFileName(value){
  metadata.name = value;
}
function checkFileType(fileType){
  for(i=0; i<acceptedImageTypes.length; i++){
    if(fileType == acceptedImageTypes[i])
      return true;
  }
  return false;
};
function loadFileAsCanvas(givenFile){ //loadSnapshottoCanvas()
  var image = new Image();
  image.onload = function(){
    canvas.width = image.width;
    canvas.height = image.height;
    stylus.drawImage(image,0,0);
  };
  var reader = new FileReader();
  reader.onload = function(event){
    image.src = event.target.result;
  };
  reader.readAsDataURL(givenFile);
};
function loadImageOntoCanvas(givenFile){ //loadImagetoCanvas()
  var image = new Image();
  image.onload = function(){
    stylus.drawImage(image,0,0,canvas.width,canvas.height);
    saveCanvasSnapshot();
  };
  var reader = new FileReader();
  reader.onload = function(event){
    image.src = event.target.result;
  };
  reader.readAsDataURL(givenFile);
}
function openSaveMenu(){
  var popup = Window.document.getElementById("saveWindow");
  var img = Window.document.getElementById('canvasMiniature');
  var fileName = Window.document.getElementById('fileName');
  var button = Window.document.getElementById('submit');
  img.width = Window.innerWidth*0.8;
  img.height = Window.innerHeight*0.4;
  img.src = canvas.toDataURL("image/png");
  popup.style.display = "block";

};
//Methods involving interacting with Canvas
function handleMouseMovement(e){ //registerMouseMove()
  var x = e.clientX - canvas.getBoundingClientRect().left;
  var y = e.clientY - canvas.getBoundingClientRect().top;
  handleCursorDrawing(x,y);
};
function handleCanvasResize(e){ //resizeCanvas()
    canvas.width = Window.innerWidth*0.8;
    canvas.height = Window.innerHeight*0.8;
    loadImageOntoCanvas();
};
async function getCanvasData(){
  var image = canvas.toDataURL("image/png");
  return fetch(image).then(function(res){
    return res.arrayBuffer();
  }).then(function(buf){ return buf; });
};
function saveCanvasSnapshot(){ //saveSnapshot()
  getCanvasData().then(function(data){
    CanvasSnapshots[CanvasSnapshots.length] = data;
    undoLayer = CanvasSnapshots.length-1;
  });
};
function buildFileFromSnapshot(snapshot){
  var file = new File([snapshot],"snapshot",{type: "image/png"});
  return file;
};
function undo(){
  if(undoLayer > 0)
    undoLayer -= 1;
  loadFileAsCanvas(buildFileFromSnapshot(CanvasSnapshots[undoLayer]));
};
function redo(){
  if(undoLayer < CanvasSnapshots.length-1)
    undoLayer += 1;
  loadFileAsCanvas(buildFileFromSnapshot(CanvasSnapshots[undoLayer]));
};
function resetSnapShotArray(){
  var temp = [];
  for(i=0;i<=undoLayer;i++)
    temp[i] = CanvasSnapshots[i];
  CanvasSnapshots = temp;
};

//Methods involving drawing onto Canvas
function wipeCanvas(){
  stylus.fillStyle = "#FFFFFF";
  stylus.fillRect(0,0,canvas.width,canvas.height);
  saveCanvasSnapshot();
};
function setStylus(value){
  stylusSettings = PrebuiltStylusSettings[value];
  setStylusSize(stylusSettings.size);
  setStylusColor(stylusSettings.color);
  stylusIsShape = false;
};
function setStylusSize(size){
  console.log("set stylus width"+size);
  stylusSettings.size = size;
  Window.document.getElementById('stylusWidth').value = size;
};
function setStylusToShape(value){
  stylusSettings = ActualShape;
  stylusSettings.id = value;
  stylusIsShape = true;
};
function setStylusColor(color){
  Window.document.getElementById("PenColor").value = color;
  stylusSettings.color = color;
};
function handleCursorDrawing(x,y){
  if(isDrawing == 1){
    if(stylusIsShape) drawShape(x,y);
    else drawCursor(x,y);
    drawingStatus = 1;
  }
  if(drawingStatus == 1 && isDrawing == 0){
    drawingStatus = 2;
    if(undoLayer != (CanvasSnapshots.length-1))
      resetSnapShotArray();
    saveCanvasSnapshot();
  }
  if(isDrawing == 0)
    drawingStatus = 0;
};
function drawCursor(x,y){
  stylus.fillStyle = stylusSettings.color;
  stylus.strokeStyle = stylusSettings.color;
  switch(stylusSettings.shape){
    case 0: //shape to draw is a circle
      drawCircle(x,y);
      break;
    case 1: //shape to draw is a square
      drawSquare(x,y);
      break;
    case 2: //shape to draw is an oval
      drawMarker(x,y);
      break;
    default:
      console.log("broke");
  };
};
function drawShape(x,y){
  stylus.fillStyle = stylusSettings.color;
  stylus.strokeStyle = stylusSettings.color;
  console.log("set color");
  switch(stylusSettings.id){
    case 0:
      drawStar(x,y);
      break;
    case 1:
      drawHouse(x,y);
      break;
    case 2:
      drawTree(x,y);
      break;
    default:
      console.error("shapeDraw broke.");
  }
};
function drawCircle(x,y){
  stylus.beginPath();
  stylus.arc(x,y,stylusSettings.size,0,2*Math.PI);
  stylus.fill();
};
function drawMarker(x,y){
  stylus.beginPath();
  stylus.ellipse(x,y,stylusSettings.size*0.2,stylusSettings.size,0,0,2*Math.PI);
  stylus.fill();
};
function drawSquare(x,y){
  stylus.fillRect(x,y,stylusSettings.size,stylusSettings.size);
};
function drawStar(x,y){ //draws a start drawing clockwise through each point of five sided star

};
function drawHouse(x,y){
  var size = stylusSettings.size;
  var tipX = x;
  var tipY = y-size;
  stylus.beginPath();
  stylus.moveTo(tipX,tipY);
  stylus.lineTo(tipX+size,tipY+size);
  stylus.stroke();
  stylus.moveTo(tipX+size,tipY+size);
  stylus.lineTo(tipX+size, tipY+size*2);
  stylus.stroke();
  stylus.moveTo(tipX+size, tipY+size*2);
  stylus.lineTo(tipX-size, tipY+size*2);
  stylus.stroke();
  stylus.moveTo(tipX,tipY);
  stylus.lineTo(tipX-size,tipY+size);
  stylus.stroke();
  stylus.moveTo(tipX-size,tipY+size);
  stylus.lineTo(tipX-size, tipY+size*2);
  stylus.stroke();
  stylus.moveTo(tipX-size,tipY+size);
  stylus.lineTo(tipX+size, tipY+size);
  stylus.stroke();
  stylus.moveTo(tipX+(size*0.3),tipY+size*2);
  stylus.lineTo(tipX+(size*0.3),tipY+size*1.3);
  stylus.stroke();
  stylus.moveTo(tipX-(size*0.3),tipY+size*2);
  stylus.lineTo(tipX-(size*0.3),tipY+size*1.3);
  stylus.stroke();
  stylus.moveTo(tipX+(size*0.3),tipY+size*1.3);
  stylus.lineTo(tipX-(size*0.3),tipY+size*1.3);
  stylus.stroke();
  stylus.closePath();
};
function drawTree(){

};

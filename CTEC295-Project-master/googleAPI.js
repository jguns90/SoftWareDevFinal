
//environment variables used by Google API
var CLIENT_ID = '';
var API_KEY = '';
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
var SCOPES = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install https://www.googleapis.com/auth/drive';

//My environment variables
var Window = "";
var LoginCredentials;
var DefaultPen = {
  shape: 'circle',
  size: 2,
  color: "#000000",
};
var SquarePen = {
  shape: 'square',
  size: 2,
  color: "#000000",
};

//ALL JS METHODS IMPLEMENTED BY GOOGLE API
function handleClientLoad(value) {
  Window = value;
  gapi.load('client:auth2', initClient);
  WebPageContentSetup(); //initializes setup of webpage after api init is finished.
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
function handleAuthClick(event) { gapi.auth2.getAuthInstance().signIn(); }
function handleSignoutClick(event) { gapi.auth2.getAuthInstance().signOut(); }

//INIT FUNCTION
function WebPageContentSetup(){
  Window = this;
  Window.currentFile = '';
  Window.canvas = Window.document.getElementById("drawingCanvas");
  Window.stylus = canvas.getContext("2d");
  Window.drawingPen = DefaultPen;

  //Event Listeners for webpage
  Window.addEventListener("resize",function(e){resizeCanvas(e);});
  Window.document.getElementById("drawingCanvas").addEventListener("mousemove", function(e){registerMouseMove(e);});
  Window.document.getElementById("drawingCanvas").addEventListener("mousedown",function(e){Window.mouseDown = true;;});
  Window.document.getElementById("drawingCanvas").addEventListener("mouseup",function(e){Window.mouseDown = false;;});
  var fileSelect = Window.document.getElementById("fileInput").addEventListener("change", event => {
      var file = event.target.files[0];
      Window.currentFile = file;
      var reader = new FileReader();
      reader.readAsDataURL(file);
    });
    console.log("Webpage setup completed");
};
//ALL JS METHODS RELATING TO FILE/API INTERACTION
function postFileToDrive(){
  saveCanvas();
  var file = Window.currentFile;
  var url = new URL("https://www.googleapis.com/upload/drive/v3/files");
  url.searchParams.append("uploadType","media");
  var request = new Request(url, {
    method: "POST",
    headers: {'Content-Type':"image/png", 'Content-Length':file.size,
    'Authorization':"Bearer "+googleUserAccount.wc.access_token},
    body: file,
  });
  fetchRequest(request);
};
async function fetchRequest(request){
  let response = await fetch(request);
  if(response.status >=200 && response.status < 300) {return response;}
  else {return Promise.reject(new Error(response.statusText));}
};


// ALL JS METHODS RELATING TO CANVAS AND DRAWING FUNCTIONS
function setColor(value){
  Window.drawingPen.color = value;
};
function loadImagetoCanvas(){
  Window.image = new Image();
  Window.image.onload = function(){
    Window.canvas.width = Window.image.width;
    canvas.height = Window.image.height;
    Window.stylus.drawImage(Window.image,0,0);
  };
  var reader = new FileReader();
  reader.onload = function(event){
    Window.image.src = event.target.result;
  };
  reader.readAsDataURL(Window.currentFile);
};
function wipeCanvas(){
  Window.stylus.fillStyle = "#FFFFFF";
  Window.stylus.fillRect(0,0,Window.canvas.width,Window.canvas.height)
}
function registerMouseMove(e){
  var x = e.clientX - Window.innerWidth*0.1;
  var y = e.clientY - Window.innerHeight*0.075;
  if(Window.mouseDown)
    draw(Window.drawingPen,x,y);
};
function resizeCanvas(e){
  Window.document.getElementById("drawingCanvas").width = this.innerWidth*0.8;
  Window.document.getElementById("drawingCanvas").height = this.innerHeight*0.8;
};
function setPen(value){
  console.log(value);
  switch(value){
    case "squarePen":
      Window.drawingPen = SquarePen;
    case "cirlcePen":
      Window.drawingPen = DefaultPen;
  }
}
function draw(pen,x,y){
  switch(pen.shape){
    case "circle":
      Window.stylus.fillStyle = pen.color;
      Window.stylus.beginPath();
      Window.stylus.arc(x,y,Window.drawingPen.size,0,2*Math.PI);
      Window.stylus.fill();
      break;
    case "square":
    console.log("square");
      Window.stylus.fillStyle = pen.color;
      Window.stylus.fillRect(x,y,width,height)
    default:
    console.log("broke");

  }
};

(function(){
  var search=document.getElementById('search');
  if(search){search.addEventListener('input',function(){
    var q=search.value.trim().toLowerCase();
    document.querySelectorAll('nav .nav-mod').forEach(function(a){
      var hay=(a.getAttribute('data-search')||'')+' '+a.textContent.toLowerCase();
      a.classList.toggle('nav-hidden', q && hay.indexOf(q)===-1);
    });
    document.querySelectorAll('.nav-group').forEach(function(g){
      var vis=g.querySelectorAll('.nav-mod:not(.nav-hidden)').length;
      g.classList.toggle('nav-hidden', q && vis===0);
    });
  });}
  document.querySelectorAll('.shot-toggle').forEach(function(tg){
    var a=tg.parentNode.querySelector('.shot');var img=a?a.querySelector('img'):null;
    tg.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        var mode=btn.getAttribute('data-mode');var src=a.getAttribute('data-'+mode);
        if(src&&img){img.src=src;a.setAttribute('href',src);}
        tg.querySelectorAll('button').forEach(function(b){b.classList.remove('on');});
        btn.classList.add('on');
      });
    });
  });
  var lb=document.getElementById('lightbox');var lbImg=lb?lb.querySelector('img'):null;
  document.querySelectorAll('.shot[href]').forEach(function(a){
    a.addEventListener('click',function(e){e.preventDefault();lbImg.src=a.getAttribute('href');lb.hidden=false;});
  });
  if(lb){lb.addEventListener('click',function(){lb.hidden=true;lbImg.src='';});}
  var mt=document.getElementById('menuToggle');var side=document.querySelector('.side');
  if(mt){mt.addEventListener('click',function(){side.classList.toggle('open');});}
})();
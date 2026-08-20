(function(){
  var search=document.getElementById('search');
  var cards=[].slice.call(document.querySelectorAll('.card,.guide'));
  if(search){search.addEventListener('input',function(){
    var q=search.value.trim().toLowerCase();
    cards.forEach(function(c){
      var hay=c.getAttribute('data-search')||'';
      c.classList.toggle('hidden', q && hay.indexOf(q)===-1);
    });
    document.querySelectorAll('.cat').forEach(function(sec){
      var vis=sec.querySelectorAll('.card:not(.hidden),.guide:not(.hidden)').length;
      sec.classList.toggle('hidden', q && vis===0);
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
function saveArticle (url, article, extraData) {
  if (!url || !article) {
    console.warn('no article found for db')
    return
  }

  db.readingList.where('url').equals(url).count(function (ct) {
    if (ct == 0) {
      db.readingList.add({
        url: url,
        time: Date.now(),
        visitCount: 1,
        pageHTML: '',
        article: article,
        extraData: extraData || {}
      })
    } else {
      db.readingList.where('url').equals(url).each(function (item) {
        db.readingList.where('url').equals(url).modify({
          url: url,
          time: Date.now(),
          visitCount: item.visitCount + 1,
          pageHTML: '',
          article: article,
          extraData: extraData || {}
        })
      })
    }
  })
}

function updateExtraData (url, newExtraData) {
  db.readingList.where('url').equals(url).each(function (item) {
    var extraData = item.extraData || {}
    for (var key in newExtraData) {
      extraData[key] = newExtraData[key]
    }

    db.readingList.update(url, {
      extraData: extraData
    })
  })
}

function getArticle (url, cb) {
  db.readingList.where('url').equals(url).count(function (count) {
    if (count > 0) {
      db.readingList.where('url').equals(url).each(cb)
    } else {
      cb(null)
    }
  })
}

function cleanupDB () {
  db.readingList.where('time').below(Date.now() - (30 * 24 * 60 * 60 * 1000)).delete()
}

setTimeout(cleanupDB, 5000)

import musicSearch from './musicSearch'
import lyric from './lyric'
import songList from './songList'
import leaderboard from './leaderboard'
import { formatSinger, formatPic } from './util'

const kw = {
  musicSearch,
  leaderboard,
  songList,
  getLyric(songInfo: any, isGetLyricx?: boolean) {
    return lyric.getLyric(songInfo, isGetLyricx)
  },
}

export default kw

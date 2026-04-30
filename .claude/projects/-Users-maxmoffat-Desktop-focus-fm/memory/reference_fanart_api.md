---
name: Fanart.tv API key
description: Fanart.tv personal API key for fetching artist images in focus.fm
type: reference
---

Fanart.tv API key: `89c4c4cdd5c70e408a8d456f9922abd7`

Used in `lastfm.js` as `FANART_KEY` to call:
`https://webservice.fanart.tv/v3/music/{mbid}?api_key={key}`

Returns `artistthumb[0].url` for square artist photos. Falls back to iTunes album art when MBID is missing or artist isn't in Fanart.tv.

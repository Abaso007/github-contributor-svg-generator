import { program } from 'commander'
import { fetchContributorsInfoFromPulls, supplementContributorsCommits } from './fetch'
import { checkContribsPersistence, saveContribsPersistence } from './persistence'
import { saveSVG as saveSVG } from './save-svg'
import { generateContributorsSVGFile } from './svg-codegen'
import type { CliOptions } from './types'

async function main() {
  program
    .option('-t, --token <token>', 'Personal GitHub token')
    .option('-o, --owner <owner>', 'Repo owner name')
    .option('-r, --repo <repo>', 'GitHub repo path')
    .option('-s, --size <size>', 'Single avatar block size (pixel)', "120")
    .option('-w, --width <width>', 'Output image width (pixel)', "1000")
    .option('-c, --count <count>', 'Avatar count in one line', "8")
    .parse(process.argv)

  const options = program.opts()
  const { token, repo, owner, size: avatarBlockSize, width, count: lineCount } = options as CliOptions
  if (token && repo && owner) {
    const startTime = performance.now()
    const allContributorsInfos = await fetchContributorsInfoFromPulls({ token, repo, owner })
    // count commits for all contributors we got in the map now
    await supplementContributorsCommits({ token, repo, owner, contributorsMap: allContributorsInfos })

    // sort contributors by commit count and pull request count
    const sortedContributors = [...allContributorsInfos.entries()]
      .sort(([, userInfoA], [, userInfoB]) => {
        const countA = userInfoA.commitURLs.length + userInfoA.pullRequestURLs.length
        const countB = userInfoB.commitURLs.length + userInfoB.pullRequestURLs.length
        return countB - countA
      })
    const identifier = `${owner}_${repo}`
    const contribUserNames = sortedContributors.map(([userName,]) => userName);
    checkContribsPersistence(
      contribUserNames,
      identifier
    )

    const svgString = await generateContributorsSVGFile({
      imgWidth: Number(width),
      blockSize: Number(avatarBlockSize),
      lineCount: Number(lineCount),
    }, sortedContributors)
    
    saveSVG(svgString, identifier);
    saveContribsPersistence(
      contribUserNames,
      identifier
    )

    const endTime = performance.now()
    console.log(`Time cost: ${Math.round((endTime - startTime) / 1000)}s`)
  }
}  

main()

import { useCallback, useEffect, useRef } from 'react'
import * as Comlink from 'comlink'
// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!../worker/bundler'
import useCustomCharts from './useCustomCharts'
import './chart-types'

let lazyWorker = null

/**
 * Build a chart from code
 *
 * @param initialCode {Record<string, string>}
 * @param options {{ onBuilded?(chart: CustomChartContract): void }}
 * @returns {{
 *  chart: CustomChartContract,
 *  buildChart: (code: Record<string, string>): void
 *  bundleChart: (code: Record<string, string>): Promise<string>
 * }}
 */
export default function useChartBuilder(initialCode = null, { onBuilded }) {
  const [charts, { uploadCustomCharts }] = useCustomCharts({
    storage: false,
  })

  useEffect(() => {
    // Good Bye Space Cowboy
    return () => {
      if (lazyWorker !== null) {
        try {
          lazyWorker.terminate()
        } catch (e) {}
        lazyWorker = null
      }
    }
  }, [])

  const bundleChart = useCallback((code) => {
    if (lazyWorker === null) {
      lazyWorker = new Worker()
    }
    const remote = Comlink.wrap(lazyWorker)
    return remote.createBundle(code)
  }, [])

  const buildChart = useCallback(
    async (code) => {
      try {
        const codeBundled = await bundleChart(code)
        // console.log('Code bundled: ', codeBundled)
        const file = new File([codeBundled], 'devchart.js', {
          type: 'application/json',
        })
        const nextCharts = await uploadCustomCharts(file, 'replace')
        if (nextCharts.length > 0) {
          onBuilded(nextCharts[0])
        }
      } catch (err) {
        console.log('Bundling error', err)
      }
    },
    [bundleChart, onBuilded, uploadCustomCharts]
  )

  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) {
      return
    }
    bootedRef.current = true
    if (initialCode !== null) {
      buildChart(initialCode)
    }
  })

  const chart = charts.length > 0 ? charts[0] : null
  return {
    chart,
    buildChart,
    bundleChart,
  }
}